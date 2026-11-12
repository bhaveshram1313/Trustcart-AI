from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class ShoppingAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    query: str = Field(..., min_length=1)


class ShoppingAssistantResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    query: str
    headline: str
    summary: str
    budgetDetected: Optional[float] = None
    filteredRiskCount: int = 0
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    modelTag: str = "Gemini AI Shopping Reasoning"


class RiskAnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    productId: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    price: Optional[float] = None
    expectedPrice: Optional[float] = None
    sellerName: Optional[str] = None
    sellerAgeDays: Optional[int] = None


class RiskIndicator(BaseModel):
    model_config = ConfigDict(extra="allow")
    title: str
    status: str
    detail: str


class RiskMetrics(BaseModel):
    model_config = ConfigDict(extra="allow")
    priceAnomaly: int = 80
    sellerCredibility: int = 80
    reviewAuthenticity: int = 80
    counterfeitSignal: int = 80
    returnProtection: int = 80


class RiskAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    sourceType: str = "custom"
    title: Optional[str] = None
    price: Optional[float] = None
    marketMedianPrice: Optional[float] = None
    sellerName: Optional[str] = None
    sellerVerified: bool = False
    trustScore: int = 80
    riskLevel: str = "safe"
    verdict: str
    metrics: RiskMetrics
    indicators: List[RiskIndicator] = Field(default_factory=list)
    saferAlternative: Optional[Dict[str, Any]] = None


class CompareProductsRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    productIds: List[str] = Field(..., min_items=1)


class CompareProductsResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    bestOverallId: Optional[str] = None
    safestId: Optional[str] = None
    bestValueId: Optional[str] = None
    hasHighRisk: bool = False
    summary: str
