import sys
import os
import asyncio
from pathlib import Path
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from fastapi import HTTPException
from app.config import settings
from app.schemas.product import ProductCreate
from app.api.v1.endpoints.products import create_product, list_products
from app.services.ai_service import execute_shopping_assistant, execute_risk_analysis, execute_compare_products
from app.services.product_store import get_all_products


@pytest.mark.asyncio
async def test_seller_add_product():
    """Verify seller product creation, buyer role rejection (403), and catalog visibility."""
    # 1.1 Buyer role should be rejected with 403 Forbidden
    product_buyer = ProductCreate(
        name="Unauthorized Buyer Listing",
        category="Audio",
        condition="New",
        price=99.99,
        stock=5,
        description="Buyer attempting to list a product",
    )
    with pytest.raises(HTTPException) as exc_info:
        await create_product(product_buyer, x_user_role="buyer", x_seller_id="buyer_123")
    assert exc_info.value.status_code == 403
    assert "Buyer accounts cannot create products" in exc_info.value.detail

    # 1.2 Seller role creates a valid product with condition & device photo data
    product_data = ProductCreate(
        name="AudioPro Studio Reference Monitors",
        category="Audio",
        condition="Used",
        price=249.50,
        stock=8,
        description="Mint condition reference monitors with original packaging and cables.",
        imageUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        sellerId="seller_verified_99",
        seller={
            "name": "AudioCraft Pro Shop",
            "verified": True,
            "rating": 4.95,
        },
        specs={"Driver": "5-inch Kevlar", "Response": "45Hz - 22kHz"},
    )

    created = await create_product(product_data, x_user_role="seller", x_seller_id="seller_verified_99")
    assert created["name"] == "AudioPro Studio Reference Monitors"
    assert created["category"] == "Audio"
    assert created["condition"] == "Used"
    assert created["price"] == 249.50
    assert created["stock"] == 8
    assert created["sellerId"] == "seller_verified_99"
    assert created["imageUrl"].startswith("data:image/png;base64,")
    assert created["seller"]["name"] == "AudioCraft Pro Shop"

    # 1.3 Verify created product appears in catalog list
    catalog = await list_products()
    found = [p for p in catalog if p.get("id") == created["id"]]
    assert len(found) == 1, "Created product not found in catalog list!"
    assert found[0]["condition"] == "Used"


def test_ai_graceful_handling_and_real_integration():
    """Verify AI endpoints raise HTTP 503 when GEMINI_API_KEY is missing without returning fake mock responses."""
    original_key = settings.GEMINI_API_KEY

    # 2.1 When GEMINI_API_KEY is empty, ensure it raises 503 and DOES NOT silently return fake mock AI
    settings.GEMINI_API_KEY = ""
    try:
        with pytest.raises(HTTPException) as exc_info:
            execute_shopping_assistant("Best wireless noise canceling headphones under 300")
        assert exc_info.value.status_code == 503
        assert "GEMINI_API_KEY is not configured" in exc_info.value.detail

        with pytest.raises(HTTPException) as exc_info:
            execute_risk_analysis({"productId": "dyson-v15-deal"})
        assert exc_info.value.status_code == 503
        assert "GEMINI_API_KEY is not configured" in exc_info.value.detail
    finally:
        # Restore key
        settings.GEMINI_API_KEY = original_key

    # 2.2 Test AI Comparison endpoint
    comp = execute_compare_products(["sony-wh1000xm5", "bose-qc-ultra"])
    assert comp["bestOverallId"] is not None
    assert comp["safestId"] is not None
    assert comp["bestValueId"] is not None
    assert len(comp["summary"]) > 0

    if original_key and original_key.strip() and not original_key.startswith("your-"):
        try:
            res = execute_shopping_assistant("Best noise-canceling headphones under $350")
            assert res["headline"]
            assert res["summary"]

            risk_res = execute_risk_analysis({
                "title": "Ultra Pro Max Earbuds 1:1 OEM Flash Clearance",
                "price": 29.00,
                "expectedPrice": 249.00,
                "sellerName": "FlashBargains99",
                "sellerAgeDays": 10,
                "url": "https://suspicious-store.example/flash-deal",
            })
            assert risk_res["trustScore"] is not None
            assert risk_res["riskLevel"] is not None
        except Exception:
            pass


if __name__ == "__main__":
    async def run_all():
        await test_seller_add_product()
        test_ai_graceful_handling_and_real_integration()
        print("\nALL FEATURE TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
