from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str = Field(..., min_length=2)
    category: str
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    imageUrl: Optional[str] = "/images/products/dock.svg"
    image: Optional[str] = "/images/products/dock.svg"
    specs: Dict[str, Any] = Field(default_factory=dict)
    stock: int = Field(default=0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    imageUrl: Optional[str] = None
    image: Optional[str] = None
    specs: Optional[Dict[str, Any]] = None
    stock: Optional[int] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    brand: Optional[str] = None
    category: str
    price: float
    originalPrice: Optional[float] = None
    marketMedianPrice: Optional[float] = None
    rating: float = 4.8
    reviewCount: int = 0
    verifiedPurchasePct: Optional[int] = None
    trustScore: int = 88
    riskLevel: str = "safe"
    image: Optional[str] = "/images/products/dock.svg"
    imageUrl: Optional[str] = "/images/products/dock.svg"
    description: Optional[str] = None
    shortSummary: Optional[str] = None
    aiVerdict: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    seller: Dict[str, Any] = Field(default_factory=dict)
    specs: Dict[str, Any] = Field(default_factory=dict)
    riskAnalysis: Optional[Dict[str, Any]] = None
    stock: int = 10
    sellerId: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
