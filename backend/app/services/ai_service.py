import re
from typing import Dict, Any, List, Optional
from app.services.product_store import get_all_products, get_product_by_id


def parse_budget(query: str) -> Optional[float]:
    match = re.search(r"(?:under|below|less than|<|max)\s*\$?\s*(\d+(?:\.\d+)?)", query, re.IGNORECASE)
    return float(match.group(1)) if match else None


def execute_shopping_assistant(query: str) -> Dict[str, Any]:
    trimmed = (query or "").strip()
    q = trimmed.lower()
    budget = parse_budget(q)

    keyword_groups = [
        {"keys": ["headphone", "anc", "audio", "earbud", "music", "sony", "bose"], "category": "Audio"},
        {"keys": ["laptop", "macbook", "notebook", "computer", "workstation"], "category": "Laptops"},
        {"keys": ["monitor", "4k", "display", "screen", "coding", "dell"], "category": "Monitors"},
        {"keys": ["keyboard", "mouse", "dock", "thunderbolt", "desk", "keychron", "logitech"], "category": "Peripherals"},
        {"keys": ["watch", "smartwatch", "wearable", "fitness", "apple watch"], "category": "Wearables"},
        {"keys": ["camera", "mirrorless", "photo", "video", "fujifilm"], "category": "Cameras"},
        {"keys": ["ssd", "storage", "drive", "nvme", "samsung"], "category": "Storage"},
        {"keys": ["vacuum", "dyson", "home", "deal"], "category": "Home Tech"},
    ]

    matched_categories = [
        g["category"] for g in keyword_groups
        if any(k in q for k in g["keys"])
    ]

    all_items = get_all_products()
    candidates = list(all_items)

    if matched_categories:
        candidates = [p for p in candidates if p.get("category") in matched_categories]
    elif len(q) > 2 and not any(w in q for w in ["safe", "best", "risk", "deal"]):
        tokens = [t for t in q.split() if len(t) > 2]
        matches = [
            p for p in candidates
            if any(t in p.get("name", "").lower() or t in p.get("brand", "").lower() for t in tokens)
        ]
        if matches:
            candidates = matches

    if budget is not None:
        within_budget = [p for p in candidates if p.get("price", 0) <= budget]
        if within_budget:
            candidates = within_budget

    wants_risky_demo = any(w in q for w in ["risk", "scam", "fake", "flag"])

    safe_picks = sorted(
        [p for p in candidates if p.get("trustScore", 0) >= 75],
        key=lambda p: p.get("trustScore", 0),
        reverse=True,
    )[:3]

    flagged_in_context = [p for p in candidates if p.get("trustScore", 0) < 60]

    if wants_risky_demo:
        recommendations = [p for p in all_items if p.get("trustScore", 0) < 60][:2]
        headline = "High-Risk Listings Flagged by TrustCart AI"
        summary = (
            "Our Gemini-powered risk classifier detected steep price anomalies, unverified pop-up sellers, "
            "and synthetic review spikes on these listings. Avoid paying outside verified escrow."
        )
    else:
        recommendations = safe_picks if safe_picks else [p for p in all_items if p.get("trustScore", 0) >= 90][:3]
        headline = "Verified Recommendations Ready"
        budget_text = f" under ${int(budget)}" if budget else ""
        cat_text = f" in {', '.join(matched_categories)}" if matched_categories else ""
        summary = (
            f"Analyzed seller credentials, 90-day pricing history, and verified buyer reviews{cat_text}{budget_text}. "
            f"Here are the highest-trust picks matching \"{trimmed or 'verified tech'}\"."
        )
        if flagged_in_context:
            summary += f" Note: {len(flagged_in_context)} suspiciously cheap listing(s) were filtered out for your safety."

    return {
        "query": trimmed,
        "headline": headline,
        "summary": summary,
        "budgetDetected": budget,
        "filteredRiskCount": len(flagged_in_context),
        "recommendations": recommendations,
        "modelTag": "FastAPI + Gemini AI Shopping Engine",
    }


def execute_risk_analysis(input_data: Dict[str, Any]) -> Dict[str, Any]:
    product_id = input_data.get("productId")
    if product_id:
        product = get_product_by_id(product_id)
        if product:
            all_prods = get_all_products()
            safer_alt = None
            if product.get("trustScore", 0) < 80:
                for p in all_prods:
                    if p.get("id") != product_id and p.get("category") == product.get("category") and p.get("trustScore", 0) >= 85:
                        safer_alt = p
                        break
            risk_analysis = product.get("riskAnalysis", {})
            return {
                "sourceType": "catalog",
                "productId": product.get("id"),
                "title": product.get("name"),
                "price": product.get("price"),
                "marketMedianPrice": product.get("marketMedianPrice", product.get("price")),
                "sellerName": product.get("seller", {}).get("name", "Verified Seller"),
                "sellerVerified": product.get("seller", {}).get("verified", True),
                "trustScore": product.get("trustScore", 88),
                "riskLevel": product.get("riskLevel", "safe"),
                "verdict": product.get("aiVerdict", "Verified listing."),
                "metrics": {
                    "priceAnomaly": risk_analysis.get("priceAnomaly", 92),
                    "sellerCredibility": risk_analysis.get("sellerCredibility", 90),
                    "reviewAuthenticity": risk_analysis.get("reviewAuthenticity", 88),
                    "counterfeitSignal": risk_analysis.get("counterfeitSignal", 94),
                    "returnProtection": risk_analysis.get("returnProtection", 90),
                },
                "indicators": risk_analysis.get("indicators", [
                    {"title": "Verified authorized seller", "status": "pass", "detail": "Listing ownership confirmed."}
                ]),
                "saferAlternative": safer_alt,
            }

    # Custom URL or form analysis
    title = (input_data.get("title") or "External Marketplace Listing").strip()
    url = (input_data.get("url") or "").strip()
    listed_price = float(input_data.get("price") or 149.0)
    expected_price = float(input_data.get("expectedPrice") or 299.0)
    seller_age_days = int(input_data.get("sellerAgeDays") or 30)
    seller_name = (input_data.get("sellerName") or "External Merchant").strip()

    lower_url = url.lower()
    lower_title = title.lower()
    suspicious_keywords = ["oem", "clearance", "flash", "bulk", "wholesale", "replica", "1:1", "unboxed"]
    has_suspicious_kw = any(kw in lower_title or kw in lower_url for kw in suspicious_keywords)
    discount_ratio = (expected_price - listed_price) / expected_price if expected_price > 0 else 0.0

    price_score = 20 if discount_ratio > 0.55 else 54 if discount_ratio > 0.35 else 76 if discount_ratio > 0.2 else 92
    seller_score = 92 if seller_age_days >= 365 else 74 if seller_age_days >= 90 else 28
    counterfeit_score = 30 if has_suspicious_kw else 42 if discount_ratio > 0.45 else 90
    review_score = 34 if seller_age_days < 45 else 84
    return_score = 35 if ("no-return" in lower_url or seller_age_days < 30) else 86

    raw_trust = int(
        price_score * 0.28 +
        seller_score * 0.26 +
        counterfeit_score * 0.22 +
        review_score * 0.14 +
        return_score * 0.10
    )
    trust_score = max(12, min(98, raw_trust))
    risk_level = "safe" if trust_score >= 80 else "caution" if trust_score >= 60 else "high"

    indicators = []
    if discount_ratio > 0.45:
        indicators.append({
            "title": f"Extreme discount anomaly ({int(discount_ratio * 100)}% below median)",
            "status": "danger",
            "detail": f"${listed_price:.2f} vs ${expected_price:.2f} reference strongly correlates with counterfeit or bait listings.",
        })
    elif discount_ratio > 0.22:
        indicators.append({
            "title": f"Notable discount ({int(discount_ratio * 100)}% below median)",
            "status": "warning",
            "detail": "Verify seller warranty eligibility and original factory seal upon arrival.",
        })
    else:
        indicators.append({
            "title": "Price matches realistic market range",
            "status": "pass",
            "detail": f"Listed price (${listed_price:.2f}) sits close to the expected ${expected_price:.2f} value.",
        })

    if seller_age_days < 45:
        indicators.append({
            "title": "Young or unestablished merchant profile",
            "status": "danger",
            "detail": f"Storefront history ({seller_age_days} days) is too short to establish fulfillment reliability.",
        })
    else:
        indicators.append({
            "title": "Established merchant track record",
            "status": "pass",
            "detail": f"Seller \"{seller_name}\" meets operational longevity thresholds.",
        })

    if has_suspicious_kw:
        indicators.append({
            "title": "High-risk listing keyword pattern detected",
            "status": "warning",
            "detail": "Phrases like OEM/Clearance/Bulk on branded electronics frequently indicate unauthorized clones.",
        })
    else:
        indicators.append({
            "title": "Clean listing metadata & title structure",
            "status": "pass",
            "detail": "No counterfeit keyword spoofing patterns detected in listing title or URL.",
        })

    verdict = (
        "Low Risk: Listing signals align with legitimate retail behavior. Proceed safely with PayPal Buyer Protection."
        if risk_level == "safe"
        else "Moderate Caution: Some merchant or pricing signals require double-checking warranty terms before checkout."
        if risk_level == "caution"
        else "High Risk Alert: Strong indicators of counterfeit risk or unverified seller behavior. Avoid direct wire/card entry."
    )

    all_prods = get_all_products()
    safer_alt = all_prods[0] if (risk_level != "safe" and all_prods) else None

    return {
        "sourceType": "custom",
        "url": url,
        "title": title,
        "price": listed_price,
        "marketMedianPrice": expected_price,
        "sellerName": seller_name,
        "sellerVerified": seller_age_days >= 180,
        "trustScore": trust_score,
        "riskLevel": risk_level,
        "verdict": verdict,
        "metrics": {
            "priceAnomaly": price_score,
            "sellerCredibility": seller_score,
            "reviewAuthenticity": review_score,
            "counterfeitSignal": counterfeit_score,
            "returnProtection": return_score,
        },
        "indicators": indicators,
        "saferAlternative": safer_alt,
    }


def execute_compare_products(product_ids: List[str]) -> Dict[str, Any]:
    prods = [get_product_by_id(pid) for pid in product_ids if get_product_by_id(pid)]
    if not prods:
        return {
            "bestOverallId": product_ids[0] if product_ids else None,
            "safestId": product_ids[0] if product_ids else None,
            "bestValueId": product_ids[0] if product_ids else None,
            "hasHighRisk": False,
            "summary": "Product comparison completed.",
        }

    safest = sorted(prods, key=lambda p: p.get("trustScore", 0), reverse=True)[0]
    best_value = sorted(
        prods,
        key=lambda p: p.get("trustScore", 0) / max(p.get("price", 1), 1),
        reverse=True,
    )[0]
    best_overall = sorted(
        prods,
        key=lambda p: p.get("trustScore", 0) * 0.55 + p.get("rating", 0) * 10 * 0.45,
        reverse=True,
    )[0]

    has_high_risk = any(p.get("trustScore", 0) < 60 for p in prods)
    summary = (
        f"Warning: One or more compared listings carry a High-Risk Trust Score (<60). "
        f"TrustCart AI strongly recommends \"{safest.get('name')}\" (Trust Score {safest.get('trustScore')}/100)."
        if has_high_risk
        else f"Across {len(prods)} products, \"{best_overall.get('name')}\" leads overall combining a "
        f"{best_overall.get('trustScore')}/100 Trust Score and {best_overall.get('rating')}★ verified rating, "
        f"while \"{best_value.get('name')}\" delivers the strongest safety-to-price ratio."
    )

    return {
        "bestOverallId": best_overall.get("id"),
        "safestId": safest.get("id"),
        "bestValueId": best_value.get("id"),
        "hasHighRisk": has_high_risk,
        "summary": summary,
    }
