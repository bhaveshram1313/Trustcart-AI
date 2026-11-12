from decimal import Decimal, InvalidOperation
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

# In-memory registry to ensure capture idempotency and prevent duplicate processing
_CAPTURED_ORDERS: Dict[str, Dict[str, Any]] = {}


def _extract_paypal_error(exc: httpx.HTTPError, fallback: str) -> str:
    """Extract descriptive error message from PayPal API responses."""
    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        try:
            data = exc.response.json()
            if isinstance(data, dict):
                # Check for standard PayPal error fields
                if data.get("details") and isinstance(data["details"], list) and len(data["details"]) > 0:
                    d = data["details"][0]
                    issue = d.get("issue")
                    desc = d.get("description")
                    if issue and desc:
                        return f"{issue}: {desc}"
                    if desc:
                        return desc
                if data.get("message"):
                    return data["message"]
                if data.get("error_description"):
                    return data["error_description"]
        except Exception:
            pass
        if exc.response.text:
            return f"{fallback} (HTTP {exc.response.status_code}: {exc.response.text[:200]})"
    return fallback


async def get_paypal_access_token() -> str:
    """Get OAuth access token from PayPal Sandbox."""
    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="PayPal Sandbox credentials are not configured in backend environment."
        )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
                auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            data = response.json()
            return data["access_token"]
    except httpx.HTTPError as exc:
        msg = _extract_paypal_error(exc, "Unable to authenticate with PayPal Sandbox.")
        logger.error(f"PayPal OAuth error: {msg}")
        raise HTTPException(status_code=502, detail=msg)


async def create_paypal_order(
    amount: float,
    subtotal: Optional[float] = None,
    shipping: Optional[float] = None,
    tax: Optional[float] = None,
    items: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Create a real PayPal Sandbox order with verified breakdown."""
    try:
        total_val = Decimal(str(amount)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid payment amount.")

    if not total_val.is_finite() or total_val <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be positive.")

    # Validate subtotal, shipping, and tax consistency if provided
    has_breakdown = False
    sub_val = Decimal("0.00")
    ship_val = Decimal("0.00")
    tax_val = Decimal("0.00")

    if subtotal is not None:
        try:
            sub_val = Decimal(str(subtotal)).quantize(Decimal("0.01"))
            ship_val = Decimal(str(shipping or 0.0)).quantize(Decimal("0.01"))
            tax_val = Decimal(str(tax or 0.0)).quantize(Decimal("0.01"))
            calculated_sum = sub_val + ship_val + tax_val
            if abs(calculated_sum - total_val) > Decimal("0.01"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Amount mismatch: subtotal (${sub_val}) + shipping (${ship_val}) + tax (${tax_val}) "
                           f"must equal grand total (${total_val}).",
                )
            has_breakdown = True
        except (InvalidOperation, ValueError):
            pass

    token = await get_paypal_access_token()

    purchase_unit: Dict[str, Any] = {
        "amount": {
            "currency_code": "USD",
            "value": str(total_val),
        }
    }

    if has_breakdown:
        purchase_unit["amount"]["breakdown"] = {
            "item_total": {"currency_code": "USD", "value": str(sub_val)},
            "shipping": {"currency_code": "USD", "value": str(ship_val)},
            "tax_total": {"currency_code": "USD", "value": str(tax_val)},
        }

        # If items are provided, verify items sum matches subtotal before attaching
        if items and isinstance(items, list):
            formatted_items = []
            item_sum = Decimal("0.00")
            for item in items:
                try:
                    qty = int(item.get("quantity", 1))
                    price = Decimal(str(item.get("price", 0.0))).quantize(Decimal("0.01"))
                    if qty > 0 and price >= Decimal("0.00"):
                        formatted_items.append({
                            "name": str(item.get("name", "Product"))[:127],
                            "unit_amount": {
                                "currency_code": "USD",
                                "value": str(price),
                            },
                            "quantity": str(qty),
                        })
                        item_sum += price * qty
                except (InvalidOperation, ValueError, TypeError):
                    continue

            if abs(item_sum - sub_val) <= Decimal("0.01") and formatted_items:
                purchase_unit["items"] = formatted_items

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [purchase_unit],
        "application_context": {
            "brand_name": "TrustCart AI",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "shipping_preference": "NO_SHIPPING",
            "return_url": "http://localhost:5173/checkout",
            "cancel_url": "http://localhost:5173/checkout",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            result = response.json()

            approve_url = None
            for link in result.get("links", []):
                if link.get("rel") == "approve":
                    approve_url = link.get("href")
                    break

            return {
                "paypalOrderId": result["id"],
                "status": result["status"],
                "approveUrl": approve_url,
                "links": result.get("links", []),
                "environment": "sandbox",
                "amount": float(total_val),
                "currency": "USD",
            }
    except httpx.HTTPError as exc:
        msg = _extract_paypal_error(exc, "Unable to create PayPal Sandbox order.")
        logger.error(f"PayPal create order error: {msg}")
        raise HTTPException(status_code=502, detail=msg)


async def get_paypal_order_details(paypal_order_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve details of an existing PayPal Sandbox order."""
    if not token:
        token = await get_paypal_access_token()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{paypal_order_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        msg = _extract_paypal_error(exc, "Unable to retrieve PayPal order details.")
        logger.error(f"PayPal get order error: {msg}")
        raise HTTPException(status_code=502, detail=msg)


async def capture_paypal_order(paypal_order_id: str) -> Dict[str, Any]:
    """Capture and verify a PayPal Sandbox order with idempotency check."""
    if not paypal_order_id or len(paypal_order_id) > 128:
        raise HTTPException(status_code=400, detail="Invalid PayPal order ID.")

    # Idempotency check: if this order was already successfully captured, return cached response
    if paypal_order_id in _CAPTURED_ORDERS:
        return _CAPTURED_ORDERS[paypal_order_id]

    token = await get_paypal_access_token()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/{paypal_order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={},
            )

            # If PayPal indicates ORDER_ALREADY_CAPTURED, check current order status
            if response.status_code == 422:
                try:
                    err_json = response.json()
                    issues = [d.get("issue") for d in err_json.get("details", [])]
                    if "ORDER_ALREADY_CAPTURED" in issues:
                        order_info = await get_paypal_order_details(paypal_order_id, token)
                        if order_info.get("status") == "COMPLETED":
                            captures = (
                                order_info.get("purchase_units", [{}])[0]
                                .get("payments", {})
                                .get("captures", [])
                            )
                            if captures and captures[0].get("status") == "COMPLETED":
                                cap = captures[0]
                                res = {
                                    "paypalOrderId": order_info["id"],
                                    "captureId": cap["id"],
                                    "status": "COMPLETED",
                                    "amount": cap.get("amount", {}).get("value"),
                                    "currency": cap.get("amount", {}).get("currency_code", "USD"),
                                    "buyerProtectionStatus": "PayPal Sandbox capture completed",
                                    "fundingSource": "PayPal Sandbox",
                                }
                                _CAPTURED_ORDERS[paypal_order_id] = res
                                return res
                except Exception:
                    pass

            response.raise_for_status()
            result = response.json()

            if result.get("status") != "COMPLETED":
                raise HTTPException(
                    status_code=402,
                    detail=f"PayPal payment status is '{result.get('status')}', expected 'COMPLETED'."
                )

            captures = (
                result.get("purchase_units", [{}])[0]
                .get("payments", {})
                .get("captures", [])
            )

            if not captures or captures[0].get("status") != "COMPLETED":
                raise HTTPException(
                    status_code=402,
                    detail="PayPal capture was not completed."
                )

            capture = captures[0]

            completed_record = {
                "paypalOrderId": result["id"],
                "captureId": capture["id"],
                "status": "COMPLETED",
                "amount": capture.get("amount", {}).get("value"),
                "currency": capture.get("amount", {}).get("currency_code", "USD"),
                "buyerProtectionStatus": "PayPal Sandbox capture completed",
                "fundingSource": "PayPal Sandbox",
            }
            _CAPTURED_ORDERS[paypal_order_id] = completed_record
            return completed_record

    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        msg = _extract_paypal_error(exc, "Unable to capture PayPal payment.")
        logger.error(f"PayPal capture error: {msg}")
        status_code = 422 if "ORDER_NOT_APPROVED" in msg else 502
        raise HTTPException(status_code=status_code, detail=msg)
