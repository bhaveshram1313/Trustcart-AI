
import re
from typing import Dict, Any, List, Optional

from app.services.product_store import get_all_products, get_product_by_id
from app.services.risk_service import RiskAssessmentService


def parse_budget(query: str) -> Optional[float]:
    match = re.search(
        r"(?:under|below|less than|<|max)\s*\$?\s*(\d+(?:\.\d+)?)",
        query,
        re.IGNORECASE,
    )
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
        group["category"]
        for group in keyword_groups
        if any(keyword in q for keyword in group["keys"])
    ]

    all_items = get_all_products()
    candidates = list(all_items)

    if matched_categories:
        candidates = [
            product for product in candidates
            if product.get("category") in matched_categories
        ]
    elif len(q) > 2 and not any(word in q for word in ["safe", "best", "risk", "deal"]):
        tokens = [token for token in q.split() if len(token) > 2]
        matches = [
            product for product in candidates
            if any(
                token in product.get("name", "").lower()
                or token in product.get("brand", "").lower()
                for token in tokens
            )
        ]
        if matches:
            candidates = matches

    if budget is not None:
        within_budget = [
            product for product in candidates
            if product.get("price", 0) <= budget
        ]
        if within_budget:
            candidates = within_budget

    wants_risky_demo = any(
        word in q for word in ["risk", "scam", "fake", "flag"]
    )

    safe_picks = sorted(
        [
            product for product in candidates
            if product.get("trustScore", 0) >= 75
        ],
        key=lambda product: product.get("trustScore", 0),
        reverse=True,
    )[:3]

    flagged_in_context = [
        product for product in candidates
        if product.get("trustScore", 0) < 60
    ]

    if wants_risky_demo:
        recommendations = [
            product for product in all_items
            if product.get("trustScore", 0) < 60
        ][:2]

        headline = "High-Risk Listings Flagged by TrustCart AI"
        summary = (
            "Risk indicators identify suspicious pricing, unverified sellers, "
            "and potentially unreliable reviews. Verify the seller and use "
            "protected payment methods before purchasing."
        )
    else:
        recommendations = (
            safe_picks
            if safe_picks
            else [
                product for product in all_items
                if product.get("trustScore", 0) >= 90
            ][:3]
        )

        headline = "Verified Recommendations Ready"

        budget_text = f" under ${int(budget)}" if budget is not None else ""
        category_text = (
            f" in {', '.join(matched_categories)}"
            if matched_categories else ""
        )

        summary = (
            f"Analyzed seller credentials, pricing and verified buyer reviews"
            f"{category_text}{budget_text}. "
            f"Here are the highest-trust picks matching "
            f"'{trimmed or 'verified tech'}'."
        )

        if flagged_in_context:
            summary += (
                f" Note: {len(flagged_in_context)} suspicious listing(s) "
                "were identified in this search."
            )

    return {
        "query": trimmed,
        "headline": headline,
        "summary": summary,
        "budgetDetected": budget,
        "filteredRiskCount": len(flagged_in_context),
        "recommendations": recommendations,
        "modelTag": "TrustCart AI Shopping Engine",
    }


def execute_risk_analysis(input_data: Dict[str, Any]) -> Dict[str, Any]:
    product_id = input_data.get("productId")

    # Catalog product risk analysis
    if product_id:
        product = get_product_by_id(product_id)

        if product:
            seller = product.get("seller", {})

            result = RiskAssessmentService.calculate_listing_trust_score(
                price=float(product.get("price", 0)),
                expected_price=float(
                    product.get(
                        "marketMedianPrice",
                        product.get("price", 0),
                    )
                ),
                seller_age_days=int(
                    seller.get("accountAgeMonths", 0) * 30
                ),
                seller_verified=seller.get("verified", False),
                authorized_dealer=seller.get("authorizedDealer", False),
                verified_purchase_pct=float(
                    product.get("verifiedPurchasePct", 80)
                ),
                return_window_days=int(
                    seller.get("returnWindowDays", 0)
                ),
                seller_rating=float(seller.get("rating", 0)),
            )

            safer_alternative = None
            if result["riskLevel"] != "safe":
                for candidate in get_all_products():
                    if (
                        candidate.get("id") != product_id
                        and candidate.get("category") == product.get("category")
                        and candidate.get("trustScore", 0) >= 85
                    ):
                        safer_alternative = candidate
                        break

            return {
                "sourceType": "catalog",
                "productId": product.get("id"),
                "title": product.get("name"),
                "price": product.get("price"),
                "marketMedianPrice": product.get("marketMedianPrice"),
                "sellerName": seller.get("name", "Unknown Seller"),
                "sellerVerified": seller.get("verified", False),
                "trustScore": result["trustScore"],
                "riskLevel": result["riskLevel"],
                "verdict": (
                    "Listing appears trustworthy based on available signals."
                    if result["riskLevel"] == "safe"
                    else "Review seller and listing details carefully before purchase."
                ),
                "metrics": result["metrics"],
                "indicators": result["indicators"],
                "saferAlternative": safer_alternative,
            }

    # External listing risk analysis
    title = (
        input_data.get("title") or "External Marketplace Listing"
    ).strip()
    url = (input_data.get("url") or "").strip()
    listed_price = float(input_data.get("price") or 149)
    expected_price = float(input_data.get("expectedPrice") or 299)
    seller_age_days = int(input_data.get("sellerAgeDays") or 30)
    seller_name = (
        input_data.get("sellerName") or "External Merchant"
    ).strip()

    result = RiskAssessmentService.calculate_listing_trust_score(
        price=listed_price,
        expected_price=expected_price,
        seller_age_days=seller_age_days,
        seller_verified=False,
        authorized_dealer=False,
        verified_purchase_pct=50,
        return_window_days=(
            0 if "no-return" in url.lower() else 30
        ),
        seller_rating=3.5,
    )

    risk_level = result["riskLevel"]

    verdict = (
        "Low Risk: Listing signals appear reasonable. Verify seller and warranty before purchase."
        if risk_level == "safe"
        else "Moderate Caution: Verify seller credentials, pricing and return policy."
        if risk_level == "caution"
        else "High Risk Alert: Strong risk signals detected. Avoid purchasing until independently verified."
    )

    return {
        "sourceType": "custom",
        "url": url,
        "title": title,
        "price": listed_price,
        "marketMedianPrice": expected_price,
        "sellerName": seller_name,
        "sellerVerified": False,
        "trustScore": result["trustScore"],
        "riskLevel": risk_level,
        "verdict": verdict,
        "metrics": result["metrics"],
        "indicators": result["indicators"],
        "saferAlternative": None,
    }


def execute_compare_products(product_ids: List[str]) -> Dict[str, Any]:
    products = [
        get_product_by_id(product_id)
        for product_id in product_ids
    ]
    products = [product for product in products if product]

    if not products:
        return {
            "bestOverallId": None,
            "safestId": None,
            "bestValueId": None,
            "hasHighRisk": False,
            "summary": "No matching products were found for comparison.",
        }

    safest = max(
        products,
        key=lambda product: product.get("trustScore", 0),
    )

    best_value = max(
        products,
        key=lambda product: (
            product.get("trustScore", 0)
            / max(product.get("price", 1), 1)
        ),
    )

    best_overall = max(
        products,
        key=lambda product: (
            product.get("trustScore", 0) * 0.55
            + product.get("rating", 0) * 10 * 0.45
        ),
    )

    has_high_risk = any(
        product.get("trustScore", 0) < 60
        for product in products
    )

    if has_high_risk:
        summary = (
            "Warning: One or more compared listings carry a High-Risk "
            "Trust Score below 60. TrustCart AI recommends "
            f"'{safest.get('name')}' as the safest option "
            f"with a Trust Score of {safest.get('trustScore')}/100."
        )
    else:
        summary = (
            f"Across {len(products)} products, "
            f"'{best_overall.get('name')}' leads overall with a "
            f"Trust Score of {best_overall.get('trustScore')}/100 "
            f"and rating {best_overall.get('rating')}. "
            f"'{best_value.get('name')}' offers the strongest "
            "trust-score-to-price ratio."
        )

    return {
        "bestOverallId": best_overall.get("id"),
        "safestId": safest.get("id"),
        "bestValueId": best_value.get("id"),
        "hasHighRisk": has_high_risk,
        "summary": summary,
    }
