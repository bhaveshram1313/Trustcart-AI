import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from google import genai
from google.genai import types

from app.config import settings
from app.services.product_store import get_all_products, get_product_by_id

logger = logging.getLogger(__name__)


def get_gemini_client() -> genai.Client:
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Gemini AI service unavailable: GEMINI_API_KEY is not configured in backend environment. "
                "Please configure GEMINI_API_KEY in backend/.env."
            ),
        )
    return genai.Client(api_key=api_key)


def execute_shopping_assistant(query: str) -> Dict[str, Any]:
    trimmed_query = (query or "").strip()
    if not trimmed_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty.",
        )

    client = get_gemini_client()
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

    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
    except Exception as e:
        logger.error(f"Gemini API call failed with model {model_name}: {e}")
        # Try fallback model if standard model failed
        if model_name != "gemini-1.5-flash":
            try:
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                model_name = "gemini-1.5-flash"
            except Exception as fallback_err:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini AI service error: {str(fallback_err)}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini AI service error: {str(e)}",
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

    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
    except Exception as e:
        logger.error(f"Gemini API call failed with model {model_name}: {e}")
        if model_name != "gemini-1.5-flash":
            try:
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                    ),
                )
                model_name = "gemini-1.5-flash"
            except Exception as fallback_err:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini AI service error: {str(fallback_err)}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini AI service error: {str(e)}",
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
            resp = client.models.generate_content(
                model=settings.GEMINI_MODEL or "gemini-2.5-flash",
                contents=prompt,
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
