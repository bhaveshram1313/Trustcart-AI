
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.paypal_service import (
    create_paypal_order,
    capture_paypal_order,
)

router = APIRouter()


class PayPalOrderRequest(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    items: List[Dict[str, Any]] = Field(default_factory=list)


class PayPalCaptureRequest(BaseModel):
    paypalOrderId: str = Field(..., min_length=1, max_length=128)
    fundingSource: Optional[str] = None


@router.post("/paypal/create-order")
async def create_order(request: PayPalOrderRequest):
    """Create a PayPal Sandbox checkout order."""

    if request.currency != "USD":
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Only USD payments are supported."
        )

    return await create_paypal_order(request.amount)


@router.post("/paypal/capture-order")
async def capture_order(request: PayPalCaptureRequest):
    """Capture a PayPal Sandbox order."""

    result = await capture_paypal_order(request.paypalOrderId)

    if request.fundingSource:
        result["fundingSource"] = request.fundingSource

    return result
