
from typing import Dict, Any


class RiskAssessmentService:
    @staticmethod
    def calculate_listing_trust_score(
        price: float,
        expected_price: float,
        seller_age_days: int = 180,
        seller_verified: bool = False,
        authorized_dealer: bool = False,
        verified_purchase_pct: float = 80,
        return_window_days: int = 30,
        seller_rating: float = 4.0,
    ) -> Dict[str, Any]:
        """Calculate listing trust score using seller, price and review signals."""

        indicators = []

        # 1. Price anomaly
        if expected_price <= 0 or price < 0:
            price_score = 0
            indicators.append({
                "title": "Invalid price information",
                "status": "danger",
                "detail": "Price must be non-negative and expected price must be positive."
            })
        else:
            discount = (expected_price - price) / expected_price

            if discount > 0.55:
                price_score = 15
                status = "danger"
            elif discount > 0.35:
                price_score = 40
                status = "warning"
            elif discount > 0.20:
                price_score = 70
                status = "warning"
            else:
                price_score = 95
                status = "pass"

            indicators.append({
                "title": "Price anomaly assessment",
                "status": status,
                "detail": f"Listed price is {discount * 100:.1f}% below expected market price."
            })

        # 2. Seller credibility
        seller_score = 20
        if seller_age_days >= 365:
            seller_score = 90
        elif seller_age_days >= 180:
            seller_score = 80
        elif seller_age_days >= 90:
            seller_score = 65
        elif seller_age_days >= 45:
            seller_score = 45

        if seller_verified:
            seller_score += 5
        if authorized_dealer:
            seller_score += 5

        seller_score = min(100, seller_score)

        indicators.append({
            "title": "Seller credibility",
            "status": "pass" if seller_score >= 75 else "warning" if seller_score >= 50 else "danger",
            "detail": f"Seller age: {seller_age_days} days; verified: {seller_verified}; authorized dealer: {authorized_dealer}."
        })

        # 3. Review authenticity
        review_score = max(0, min(100, int(verified_purchase_pct)))

        indicators.append({
            "title": "Verified purchase review ratio",
            "status": "pass" if review_score >= 85 else "warning" if review_score >= 60 else "danger",
            "detail": f"{review_score}% of purchases are verified."
        })

        # 4. Counterfeit risk signal
        counterfeit_score = 90
        if discount_ratio := (
            (expected_price - price) / expected_price
            if expected_price > 0 else 1
        ):
            if discount_ratio > 0.55:
                counterfeit_score = 20
            elif discount_ratio > 0.35:
                counterfeit_score = 45

        if not authorized_dealer:
            counterfeit_score = min(counterfeit_score, 65)

        # 5. Return protection
        return_score = min(100, max(0, return_window_days * 3))
        if return_window_days == 0:
            return_score = 10

        indicators.append({
            "title": "Return protection",
            "status": "pass" if return_score >= 75 else "warning" if return_score >= 40 else "danger",
            "detail": f"Return window: {return_window_days} days."
        })

        # 6. Weighted trust score
        trust_score = round(
            price_score * 0.28
            + seller_score * 0.26
            + review_score * 0.14
            + counterfeit_score * 0.22
            + return_score * 0.10
        )

        trust_score = max(0, min(100, trust_score))

        risk_level = (
            "safe" if trust_score >= 80
            else "caution" if trust_score >= 60
            else "high"
        )

        return {
            "trustScore": trust_score,
            "riskLevel": risk_level,
            "metrics": {
                "priceAnomaly": price_score,
                "sellerCredibility": seller_score,
                "reviewAuthenticity": review_score,
                "counterfeitSignal": counterfeit_score,
                "returnProtection": return_score,
            },
            "indicators": indicators,
        }
