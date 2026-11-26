import json
import logging
import sys
import time
from typing import Dict, Any, List, Optional, Tuple
from fastapi import HTTPException, status

from app.config import settings
from app.services.product_store import get_all_products, get_product_by_id

logger = logging.getLogger(__name__)

# Cache of models confirmed to support generateContent
_CONFIRMED_FALLBACK_MODELS: set = set()


def is_transient_error(exc: Exception) -> bool:
    """
    Checks if an exception represents a transient failure eligible for retry.
    Catches 503 (UNAVAILABLE), 429 (RESOURCE_EXHAUSTED / RATE_LIMIT),
    and 5xx server errors, as well as network/connection timeouts.
    """
    if isinstance(exc, HTTPException):
        return exc.status_code in (429, 500, 502, 503, 504)

    # Check google.genai errors or generic code/status attributes
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if code in (429, 500, 502, 503, 504):
        return True

    status_str = str(getattr(exc, "status", "") or "").upper()
    if status_str in ("UNAVAILABLE", "RESOURCE_EXHAUSTED", "DEADLINE_EXCEEDED", "INTERNAL"):
        return True

    # Check exception class name
    exc_type = type(exc).__name__.lower()
    if any(k in exc_type for k in ("timeout", "connecterror", "connectionerror", "servererror")):
        return True

    # Check message contents
    msg = str(exc).upper()
    if any(term in msg for term in (
        "503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED",
        "HIGH DEMAND", "SPIKES IN DEMAND", "TIMEOUT", "CONNECTION RESET", "SERVER ERROR"
    )):
        return True

    return False


def confirm_model_supports_generate_content(client: Any, model_name: str) -> bool:
    """
    Confirms whether a model supports generateContent.
    Queries client.models.get(model=model_name) and checks supported_actions.
    Caches verified models in-memory to avoid redundant API queries.
    """
    cleaned = (model_name or "").strip()
    if not cleaned:
        return False

    if cleaned in _CONFIRMED_FALLBACK_MODELS:
        return True

    try:
        model_info = client.models.get(model=cleaned)
        supported_actions = getattr(model_info, "supported_actions", None) or []
        actions_lower = [str(act).lower() for act in supported_actions]
        if "generatecontent" in actions_lower or "generate_content" in actions_lower or not supported_actions:
            _CONFIRMED_FALLBACK_MODELS.add(cleaned)
            return True
        logger.warning(
            f"Configured fallback model '{cleaned}' does not support generateContent. "
            f"Supported actions: {supported_actions}"
        )
        return False
    except Exception as e:
        logger.warning(
            f"Failed to confirm generateContent capability for fallback model '{cleaned}': {e}"
        )
        return False


def generate_content_with_retry_and_fallback(
    client: Any,
    prompt: str,
    config: Optional[Any] = None,
    max_retries: int = 2,
    initial_delay: Optional[float] = None,
    backoff_factor: float = 2.0,
) -> Tuple[Any, str]:
    """
    Executes client.models.generate_content with:
    1. A bounded exponential backoff retry strategy for transient errors (503, 429, 5xx).
    2. Fallback to GEMINI_FALLBACK_MODEL if configured and confirmed to support generateContent.
    3. Clear, user-friendly service-unavailable HTTP 503 response if both models fail.

    Returns:
        Tuple of (response, model_used)
    """
    primary_model = (settings.GEMINI_MODEL or "").strip() or "gemini-3.8-flash"
    fallback_model = (getattr(settings, "GEMINI_FALLBACK_MODEL", "") or "").strip()

    # Fast test delays under pytest, standard backoff in production
    if initial_delay is None:
        initial_delay = 0.01 if ("pytest" in sys.modules or getattr(settings, "ENVIRONMENT", "") == "test") else 0.5

    last_error: Optional[Exception] = None
    transient_failure = False

    # Attempt primary model with bounded exponential backoff
    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=primary_model,
                contents=prompt,
                config=config,
            )
            return response, primary_model
        except Exception as e:
            last_error = e
            transient_failure = is_transient_error(e)
            logger.warning(
                f"Gemini API attempt {attempt + 1}/{max_retries + 1} for model '{primary_model}' failed: {e}"
            )
            if not transient_failure or attempt >= max_retries:
                break
            sleep_duration = initial_delay * (backoff_factor ** attempt)
            time.sleep(sleep_duration)

    # If primary model is unavailable, attempt configured fallback model once
    fallback_attempted = False
    if fallback_model and fallback_model != primary_model:
        if confirm_model_supports_generate_content(client, fallback_model):
            fallback_attempted = True
            logger.info(
                f"Primary model '{primary_model}' unavailable. Attempting fallback model '{fallback_model}' once..."
            )
            try:
                fallback_response = client.models.generate_content(
                    model=fallback_model,
                    contents=prompt,
                    config=config,
                )
                return fallback_response, fallback_model
            except Exception as fb_err:
                logger.error(f"Fallback model '{fallback_model}' failed: {fb_err}")
                last_error = fb_err
                transient_failure = transient_failure or is_transient_error(fb_err)
        else:
            logger.warning(
                f"Configured fallback model '{fallback_model}' could not be confirmed to support generateContent; skipping."
            )

    # Both models failed or primary failed without a working fallback
    if transient_failure:
        if fallback_attempted:
            detail_msg = (
                f"The Gemini AI service is temporarily experiencing high demand across available models "
                f"({primary_model}, {fallback_model}). Spikes in demand are usually temporary. Please try again in a few moments."
            )
        else:
            detail_msg = (
                f"The Gemini AI service ({primary_model}) is temporarily experiencing high demand. "
                f"Spikes in demand are usually temporary. Please try again in a few moments."
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail_msg,
        )

    # Non-transient errors (e.g. invalid arguments, malformed request)
    err_detail = getattr(last_error, "message", None) or str(last_error)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Gemini AI service error ({primary_model}): {err_detail}",
    )


def get_gemini_client():
    """
    Safely initialize and return Google GenAI Client on demand.
    Avoids top-level imports or network checks during server boot.
    """
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Gemini AI service unavailable: GEMINI_API_KEY is not configured in backend environment. "
                "Please configure GEMINI_API_KEY in backend/.env."
            ),
        )
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI Client: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Google GenAI SDK initialization error: {str(e)}",
        )


def execute_shopping_assistant(query: str) -> Dict[str, Any]:
    trimmed_query = (query or "").strip()
    if not trimmed_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty.",
        )

    client = get_gemini_client()
    from google.genai import types

    catalog_products = get_all_products()

    # Create compact catalog context for the LLM
    catalog_summary = [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "brand": p.get("brand"),
            "category": p.get("category"),
            "condition": p.get("condition", "New"),
            "price": p.get("price"),
            "trustScore": p.get("trustScore"),
            "riskLevel": p.get("riskLevel"),
            "sellerName": p.get("seller", {}).get("name"),
            "sellerVerified": p.get("seller", {}).get("verified"),
            "rating": p.get("rating"),
            "shortSummary": p.get("shortSummary") or p.get("description", "")[:120],
        }
        for p in catalog_products
    ]

    prompt = f"""You are TrustCart AI's shopping assistant. You help buyers find verified products matching their needs and budget, and protect them from counterfeit listings and scam sellers.

User Search / Question:
"{trimmed_query}"

Available Products in Catalog:
{json.dumps(catalog_summary, indent=2)}

Instructions:
1. Understand the user's intent, category preference, and any budget mentioned.
2. If the user asked to flag suspicious/risky items, select products with lower trust scores or risk indicators.
3. Otherwise, pick the best matching, highest-trust products from the catalog (up to 3 products).
4. Provide a punchy headline (e.g., "Verified Noise-Canceling Headphones Under $350").
5. Provide a clear, natural AI summary (2-3 sentences) explaining why these items were recommended based on seller verification, trust score, and pricing.
6. Extract the detected budget number if specified (e.g. 350 for "$350"), or null if no budget was specified.
7. Count how many matching products in the catalog were filtered out due to lower trust or high risk.

You MUST respond strictly with a valid JSON object matching this schema:
{{
  "headline": "<string>",
  "summary": "<string>",
  "budgetDetected": <number or null>,
  "filteredRiskCount": <int>,
  "recommendedProductIds": ["<id1>", "<id2>"]
}}
"""

    response, model_name = generate_content_with_retry_and_fallback(
        client=client,
        prompt=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    try:
        parsed = json.loads(response.text)
    except Exception as parse_err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI returned invalid JSON: {str(parse_err)}",
        )

    recommended_ids = parsed.get("recommendedProductIds") or []
    recommendations = []
    for pid in recommended_ids:
        prod = get_product_by_id(pid)
        if prod:
            recommendations.append(prod)

    # Fallback to high-trust catalog products if recommended IDs didn't match
    if not recommendations:
        for p in catalog_products:
            if p.get("trustScore", 0) >= 80:
                recommendations.append(p)
            if len(recommendations) >= 3:
                break

    return {
        "query": trimmed_query,
        "headline": parsed.get("headline", "Verified Recommendations Ready"),
        "summary": parsed.get("summary", ""),
        "budgetDetected": parsed.get("budgetDetected"),
        "filteredRiskCount": parsed.get("filteredRiskCount", 0),
        "recommendations": recommendations,
        "modelTag": f"Google Gemini ({model_name})",
    }


def execute_risk_analysis(input_data: Dict[str, Any]) -> Dict[str, Any]:
    client = get_gemini_client()
    from google.genai import types

    product_id = input_data.get("productId")

    # Case 1: Catalog product
    if product_id:
        product = get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{product_id}' not found in catalog.",
            )
        seller = product.get("seller", {})
        title = product.get("name", "Catalog Product")
        price = float(product.get("price", 0))
        expected_price = float(product.get("marketMedianPrice", price))
        seller_name = seller.get("name", "Unknown Seller")
        seller_verified = bool(seller.get("verified", False))
        seller_age_days = int(seller.get("accountAgeMonths", 12) * 30)
        source_type = "catalog"
        url = f"https://trustcart.ai/products/{product_id}"
        specs = product.get("specs", {})
    else:
        # Case 2: Custom / External listing
        source_type = "custom"
        title = (input_data.get("title") or "External Marketplace Listing").strip()
        url = (input_data.get("url") or "").strip()
        price = float(input_data.get("price") or 149)
        expected_price = float(input_data.get("expectedPrice") or 299)
        seller_age_days = int(input_data.get("sellerAgeDays") or 30)
        seller_name = (input_data.get("sellerName") or "External Merchant").strip()
        seller_verified = False
        specs = {}

    prompt = f"""You are TrustCart AI's Risk Analysis Engine.
Evaluate the following e-commerce listing for counterfeit signals, pricing anomalies, seller credibility, review authenticity, and return protection risks.

Listing Details:
- Source: {source_type}
- Title: {title}
- Listed Price: ${price:.2f}
- Reference / Expected Market Price: ${expected_price:.2f}
- Seller Name: {seller_name}
- Seller Verified Status: {seller_verified}
- Seller Account Age: {seller_age_days} days
- Listing URL: {url}
- Specifications: {json.dumps(specs)}

Analysis Tasks:
1. Calculate a Trust Score integer from 0 to 100:
   - 80-100: 'safe' (realistic pricing, verified/established seller, clear return protection)
   - 60-79: 'caution' (moderate discount, shorter seller track record, or unverified seller)
   - 0-59: 'high' (extreme discount >45% below reference, young seller <45 days, suspicious OEM/clearance keywords, or no-return policy)
2. Assign the riskLevel: 'safe' if trustScore >= 80, 'caution' if 60 <= trustScore < 80, 'high' if trustScore < 60.
3. Formulate a 1-2 sentence AI verdict summarizing the risk assessment and recommendation for the buyer.
4. Score each of the 5 sub-metrics (0 to 100 integer):
   - priceAnomaly (100 = realistic pricing, low score = steep unrealistic discount or price gouging)
   - sellerCredibility (100 = established, verified merchant; low score = new or unverified seller)
   - reviewAuthenticity (100 = genuine organic buyer reviews; low score = suspected bot/inauthentic reviews)
   - counterfeitSignal (100 = genuine brand indicators; low score = clone/replica/suspicious OEM signs)
   - returnProtection (100 = full 30-day return & escrow protection; low score = no return or high dispute risk)
5. Generate 3 to 5 specific risk indicators. Each indicator must have:
   - "title": concise description (e.g., "Price matches realistic market range", "Extreme discount anomaly")
   - "status": one of "pass", "warning", or "danger"
   - "detail": a factual 1-sentence explanation citing the specific listing figures.

You MUST respond strictly with a valid JSON object matching this schema:
{{
  "trustScore": <int 0-100>,
  "riskLevel": "<'safe' | 'caution' | 'high'>",
  "verdict": "<string>",
  "metrics": {{
    "priceAnomaly": <int 0-100>,
    "sellerCredibility": <int 0-100>,
    "reviewAuthenticity": <int 0-100>,
    "counterfeitSignal": <int 0-100>,
    "returnProtection": <int 0-100>
  }},
  "indicators": [
    {{
      "title": "<string>",
      "status": "<'pass' | 'warning' | 'danger'>",
      "detail": "<string>"
    }}
  ]
}}
"""

    response, model_name = generate_content_with_retry_and_fallback(
        client=client,
        prompt=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )

    try:
        parsed = json.loads(response.text)
    except Exception as parse_err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI returned invalid JSON: {str(parse_err)}",
        )

    trust_score = int(parsed.get("trustScore", 80))
    risk_level = parsed.get("riskLevel") or (
        "safe" if trust_score >= 80 else "caution" if trust_score >= 60 else "high"
    )

    safer_alternative = None
    if risk_level != "safe":
        for candidate in get_all_products():
            if candidate.get("id") != product_id and candidate.get("trustScore", 0) >= 85:
                safer_alternative = candidate
                break

    return {
        "sourceType": source_type,
        "productId": product_id,
        "url": url,
        "title": title,
        "price": price,
        "marketMedianPrice": expected_price,
        "sellerName": seller_name,
        "sellerVerified": seller_verified,
        "trustScore": trust_score,
        "riskLevel": risk_level,
        "verdict": parsed.get("verdict", "AI risk assessment completed."),
        "metrics": parsed.get("metrics", {
            "priceAnomaly": 80,
            "sellerCredibility": 80,
            "reviewAuthenticity": 80,
            "counterfeitSignal": 80,
            "returnProtection": 80,
        }),
        "indicators": parsed.get("indicators", []),
        "saferAlternative": safer_alternative,
    }


def execute_compare_products(product_ids: List[str]) -> Dict[str, Any]:
    products = [get_product_by_id(pid) for pid in product_ids]
    products = [p for p in products if p]

    if not products:
        return {
            "bestOverallId": None,
            "safestId": None,
            "bestValueId": None,
            "hasHighRisk": False,
            "summary": "No matching products were found for comparison.",
        }

    safest = max(products, key=lambda p: p.get("trustScore", 0))
    best_value = max(
        products,
        key=lambda p: (p.get("trustScore", 0) / max(p.get("price", 1), 1)),
    )
    best_overall = max(
        products,
        key=lambda p: (
            p.get("trustScore", 0) * 0.55 + p.get("rating", 0) * 10 * 0.45
        ),
    )
    has_high_risk = any(p.get("trustScore", 0) < 60 for p in products)

    # If GEMINI_API_KEY is configured, ask Gemini for an executive comparison synthesis
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""Compare these {len(products)} products for an online shopper.
Products:
{json.dumps([{
    'id': p.get('id'),
    'name': p.get('name'),
    'price': p.get('price'),
    'trustScore': p.get('trustScore'),
    'rating': p.get('rating'),
    'specs': p.get('specs')
} for p in products], indent=2)}

Calculated winners:
- Safest: {safest.get('name')} (Trust Score: {safest.get('trustScore')})
- Best Value: {best_value.get('name')}
- Best Overall: {best_overall.get('name')}

Write a concise 2-sentence executive summary comparing them and recommending which type of buyer should pick which."""
            resp, _ = generate_content_with_retry_and_fallback(
                client=client,
                prompt=prompt,
            )
            if resp.text:
                summary = resp.text.strip()
            else:
                raise ValueError("Empty response")
        except Exception:
            if has_high_risk:
                summary = (
                    f"Warning: One or more compared listings carry a High-Risk Trust Score below 60. "
                    f"TrustCart AI recommends '{safest.get('name')}' as the safest option with a Trust Score of {safest.get('trustScore')}/100."
                )
            else:
                summary = (
                    f"Across {len(products)} products, '{best_overall.get('name')}' leads overall with a "
                    f"Trust Score of {best_overall.get('trustScore')}/100 and rating {best_overall.get('rating')}. "
                    f"'{best_value.get('name')}' offers the strongest trust-score-to-price ratio."
                )
    else:
        if has_high_risk:
            summary = (
                f"Warning: One or more compared listings carry a High-Risk Trust Score below 60. "
                f"TrustCart AI recommends '{safest.get('name')}' as the safest option with a Trust Score of {safest.get('trustScore')}/100."
            )
        else:
            summary = (
                f"Across {len(products)} products, '{best_overall.get('name')}' leads overall with a "
                f"Trust Score of {best_overall.get('trustScore')}/100 and rating {best_overall.get('rating')}. "
                f"'{best_value.get('name')}' offers the strongest trust-score-to-price ratio."
            )

    return {
        "bestOverallId": best_overall.get("id"),
        "safestId": safest.get("id"),
        "bestValueId": best_value.get("id"),
        "hasHighRisk": has_high_risk,
        "summary": summary,
    }
