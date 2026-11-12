from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class OrderItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    productId: str
    name: str
    price: float
    quantity: int = Field(default=1, ge=1)
    image: Optional[str] = None
    sellerName: Optional[str] = None
    trustScore: Optional[int] = None


class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    items: List[OrderItem]
    totalAmount: Optional[float] = None
    total: Optional[float] = None
    shippingAddress: str
    paymentMethod: str = "paypal"
    userId: Optional[str] = None
    paypalTransactionId: Optional[str] = None
    paypalOrderId: Optional[str] = None
    buyerProtectionStatus: Optional[str] = None
    subtotal: Optional[float] = None
    shipping: Optional[float] = 0.0
    tax: Optional[float] = 0.0
    trustScoreAtPurchase: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def reconcile_totals(cls, data: Any) -> Any:
        if isinstance(data, dict):
            tot = data.get("totalAmount")
            if tot is None:
                tot = data.get("total")
            if tot is not None:
                val = float(tot)
                data["totalAmount"] = val
                data["total"] = val
            elif data.get("subtotal") is not None:
                sub = float(data.get("subtotal", 0.0))
                shp = float(data.get("shipping", 0.0))
                tx = float(data.get("tax", 0.0))
                val = round(sub + shp + tx, 2)
                data["totalAmount"] = val
                data["total"] = val
        return data


class OrderResponse(OrderCreate):
    model_config = ConfigDict(extra="allow")

    id: str
    status: str = "paid"
    paymentStatus: str = "COMPLETED"
    trackingNumber: Optional[str] = None
    createdAt: str
    date: Optional[str] = None
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
