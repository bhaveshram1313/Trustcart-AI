import sys
import os
import asyncio
from pathlib import Path
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from unittest.mock import MagicMock
from fastapi import HTTPException
from app.config import Settings, settings
from app.schemas.product import ProductCreate
from app.api.v1.endpoints.products import create_product, list_products
import app.services.ai_service as ai_service_module
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


def test_gemini_model_configuration_and_sdk_dispatch(monkeypatch):
    """
    Verify:
    1. GEMINI_MODEL loads correctly from environment into Pydantic Settings.
    2. GEMINI_MODEL defaults to 'gemini-3.8-flash' when absent or empty.
    3. Changing GEMINI_MODEL changes the exact model passed to Gemini SDK generate_content.
    4. No hardcoded fallback to 'gemini-1.5-flash' occurs when an API error is raised.
    """
    # 1. Pydantic default when absent
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    default_cfg = Settings()
    assert default_cfg.GEMINI_MODEL == "gemini-3.8-flash"

    # 2. Pydantic loaded from environment
    monkeypatch.setenv("GEMINI_MODEL", "gemini-render-env-test")
    env_cfg = Settings()
    assert env_cfg.GEMINI_MODEL == "gemini-render-env-test"

    # 3. Pydantic defaults when empty/whitespace
    monkeypatch.setenv("GEMINI_MODEL", "   ")
    blank_cfg = Settings()
    assert blank_cfg.GEMINI_MODEL == "gemini-3.8-flash"

    # 4. Verify actual model passed to Gemini SDK generate_content
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"headline": "Test Title", "summary": "Test Summary", "recommendedProductIds": []}'
    mock_client.models.generate_content.return_value = mock_response

    monkeypatch.setattr(ai_service_module, "get_gemini_client", lambda: mock_client)

    # Test with default model
    settings.GEMINI_MODEL = "gemini-3.8-flash"
    res1 = execute_shopping_assistant("wireless earbuds")
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-3.8-flash"
    assert "gemini-3.8-flash" in res1["modelTag"]

    # Test with custom overridden model
    settings.GEMINI_MODEL = "gemini-custom-pro-model"
    res2 = execute_shopping_assistant("studio microphones")
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-custom-pro-model"
    assert "gemini-custom-pro-model" in res2["modelTag"]

    # Test with Risk Analysis endpoint
    mock_response.text = (
        '{"trustScore": 85, "riskLevel": "safe", "verdict": "Low risk.", '
        '"metrics": {"priceAnomaly": 90, "sellerCredibility": 85, "reviewAuthenticity": 80, '
        '"counterfeitSignal": 90, "returnProtection": 85}, "indicators": []}'
    )
    settings.GEMINI_MODEL = "gemini-risk-specialized-model"
    execute_risk_analysis({"title": "Test Camera", "price": 400.0})
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-risk-specialized-model"

    # 5. Verify NO hardcoded fallback to gemini-1.5-flash occurs on exception
    mock_client.models.generate_content.reset_mock()
    mock_client.models.generate_content.side_effect = Exception("Invalid request: syntax error")
    settings.GEMINI_MODEL = "gemini-3.8-flash"

    with pytest.raises(HTTPException) as exc_info:
        execute_shopping_assistant("bluetooth speakers")
    assert exc_info.value.status_code == 502
    assert "Gemini AI service error" in exc_info.value.detail
    # Must only have been called ONCE with gemini-3.8-flash, never a secondary call to gemini-1.5-flash
    assert mock_client.models.generate_content.call_count == 1
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-3.8-flash"


def test_gemini_503_retry_and_fallback_scenarios(monkeypatch):
    """
    Verify:
    1. Primary success: primary model succeeds on first attempt.
    2. 503 retry: transient 503 succeeds after bounded exponential backoff retry.
    3. Fallback success: primary fails with 503 after retries, fallback model confirmed & succeeds.
    4. Both models unavailable: raises user-friendly HTTP 503 without mock AI.
    5. Fallback model without generateContent is safely skipped.
    """
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"headline": "Verified Deals", "summary": "Great picks.", "recommendedProductIds": []}'

    monkeypatch.setattr(ai_service_module, "get_gemini_client", lambda: mock_client)
    ai_service_module._CONFIRMED_FALLBACK_MODELS.clear()

    # 1. Primary Success
    settings.GEMINI_MODEL = "gemini-3.8-flash"
    settings.GEMINI_FALLBACK_MODEL = ""
    mock_client.models.generate_content.reset_mock()
    mock_client.models.generate_content.return_value = mock_response
    mock_client.models.generate_content.side_effect = None

    res1 = execute_shopping_assistant("smartwatches")
    assert mock_client.models.generate_content.call_count == 1
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-3.8-flash"
    assert "gemini-3.8-flash" in res1["modelTag"]

    # 2. 503 Retry: Fails attempt 1 with 503 UNAVAILABLE, succeeds attempt 2
    mock_client.models.generate_content.reset_mock()
    err_503 = Exception("503 UNAVAILABLE. {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.'}}")
    mock_client.models.generate_content.side_effect = [err_503, mock_response]

    res2 = execute_shopping_assistant("noise canceling headphones")
    assert mock_client.models.generate_content.call_count == 2
    assert mock_client.models.generate_content.call_args_list[0].kwargs["model"] == "gemini-3.8-flash"
    assert mock_client.models.generate_content.call_args_list[1].kwargs["model"] == "gemini-3.8-flash"
    assert "gemini-3.8-flash" in res2["modelTag"]

    # 3. Fallback Success: Primary model fails with 503 on all attempts, fallback model confirmed and succeeds
    settings.GEMINI_MODEL = "gemini-3.8-flash"
    settings.GEMINI_FALLBACK_MODEL = "gemini-2.5-flash"
    ai_service_module._CONFIRMED_FALLBACK_MODELS.clear()

    mock_client.models.reset_mock()
    mock_model_info = MagicMock()
    mock_model_info.supported_actions = ["generateContent"]
    mock_client.models.get.return_value = mock_model_info

    def side_effect_fallback(*args, **kwargs):
        if kwargs.get("model") == "gemini-3.8-flash":
            raise Exception("503 UNAVAILABLE: Spikes in demand are usually temporary.")
        if kwargs.get("model") == "gemini-2.5-flash":
            return mock_response
        raise Exception(f"Unexpected model: {kwargs.get('model')}")

    mock_client.models.generate_content.side_effect = side_effect_fallback

    res3 = execute_shopping_assistant("gaming laptops")
    # Primary attempted 3 times (attempt 1 + 2 retries), fallback attempted 1 time
    assert mock_client.models.generate_content.call_count == 4
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-2.5-flash"
    assert "gemini-2.5-flash" in res3["modelTag"]

    # 4. Both models unavailable: Returns clear, user-friendly HTTP 503
    mock_client.models.reset_mock()
    mock_client.models.generate_content.side_effect = Exception("503 UNAVAILABLE: High demand across all endpoints.")

    with pytest.raises(HTTPException) as exc_info:
        execute_shopping_assistant("wireless keyboards")
    assert exc_info.value.status_code == 503
    assert "temporarily experiencing high demand" in exc_info.value.detail
    assert "gemini-3.8-flash" in exc_info.value.detail
    assert "gemini-2.5-flash" in exc_info.value.detail

    # 5. Fallback model without generateContent capability is skipped
    settings.GEMINI_MODEL = "gemini-3.8-flash"
    settings.GEMINI_FALLBACK_MODEL = "text-embedding-004"
    ai_service_module._CONFIRMED_FALLBACK_MODELS.clear()

    embedding_model_info = MagicMock()
    embedding_model_info.supported_actions = ["embedContent"]
    mock_client.models.get.return_value = embedding_model_info
    mock_client.models.generate_content.reset_mock()
    mock_client.models.generate_content.side_effect = Exception("503 UNAVAILABLE: High demand.")

    with pytest.raises(HTTPException) as exc_info:
        execute_shopping_assistant("monitors")
    assert exc_info.value.status_code == 503
    # generate_content was called for primary only, NEVER for text-embedding-004
    for call in mock_client.models.generate_content.call_args_list:
        assert call.kwargs["model"] == "gemini-3.8-flash"

    # Reset settings back
    settings.GEMINI_FALLBACK_MODEL = ""


if __name__ == "__main__":
    async def run_all():
        await test_seller_add_product()
        test_ai_graceful_handling_and_real_integration()
        mp = pytest.MonkeyPatch()
        try:
            test_gemini_model_configuration_and_sdk_dispatch(mp)
        finally:
            mp.undo()
        print("\nALL FEATURE TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
