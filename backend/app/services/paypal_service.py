
from decimal import Decimal, InvalidOperation

import httpx
from fastapi import HTTPException

from app.config import settings


async def get_paypal_access_token():
    """Get OAuth access token from PayPal Sandbox."""

    if not settings.PAYPAL_CLIENT_ID or not settings.PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="PayPal credentials are not configured."
        )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v1/oauth2/token",
                auth=(
                    settings.PAYPAL_CLIENT_ID,
                    settings.PAYPAL_CLIENT_SECRET
                ),
                data={"grant_type": "client_credentials"},
            )

            response.raise_for_status()
            return response.json()["access_token"]

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to authenticate with PayPal."
        )


async def create_paypal_order(amount: float):
    """Create a real PayPal Sandbox order."""

    try:
        value = Decimal(str(amount)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid payment amount.")

    if not value.is_finite() or value <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive.")

    token = await get_paypal_access_token()

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": "USD",
                    "value": str(value),
                }
            }
        ],
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

            return {
                "paypalOrderId": result["id"],
                "status": result["status"],
                "environment": "sandbox",
                "amount": float(value),
                "currency": "USD",
            }

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to create PayPal order."
        )


async def capture_paypal_order(paypal_order_id: str):
    """Capture and verify a PayPal Sandbox order."""

    if not paypal_order_id or len(paypal_order_id) > 128:
        raise HTTPException(status_code=400, detail="Invalid PayPal order ID.")

    token = await get_paypal_access_token()

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.PAYPAL_BASE_URL}/v2/checkout/orders/"
                f"{paypal_order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={},
            )

            response.raise_for_status()
            result = response.json()

            if result.get("status") != "COMPLETED":
                raise HTTPException(
                    status_code=402,
                    detail="PayPal payment was not completed."
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

            return {
                "paypalOrderId": result["id"],
                "captureId": capture["id"],
                "status": "COMPLETED",
                "amount": capture.get("amount", {}).get("value"),
                "currency": capture.get("amount", {}).get("currency_code"),
                "buyerProtectionStatus": "PayPal Sandbox capture completed",
                "fundingSource": "PayPal Sandbox",
            }

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to capture PayPal payment."
        )
