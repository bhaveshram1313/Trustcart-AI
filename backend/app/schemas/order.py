from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field


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
    totalAmount: float = Field(..., gt=0)
    shippingAddress: str
    paymentMethod: str = "paypal"
    userId: Optional[str] = None
    paypalTransactionId: Optional[str] = None
    subtotal: Optional[float] = None


class OrderResponse(OrderCreate):
    model_config = ConfigDict(extra="allow")

    id: str
    status: str = "paid"
    trackingNumber: Optional[str] = None
    createdAt: str
    date: Optional[str] = None
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
