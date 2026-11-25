from fastapi import APIRouter
from app.schemas.ai import (
    ShoppingAssistantRequest,
    ShoppingAssistantResponse,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    CompareProductsRequest,
    CompareProductsResponse,
)
from app.services.ai_service import (
    execute_shopping_assistant,
    execute_risk_analysis,
    execute_compare_products,
)

router = APIRouter()


@router.post("/assistant", response_model=ShoppingAssistantResponse)
async def ask_shopping_assistant(payload: ShoppingAssistantRequest):
    """
    AI Shopping Assistant endpoint returning verified recommendations and Trust Score insights.
    """
    return execute_shopping_assistant(payload.query)


@router.post("/risk-analysis", response_model=RiskAnalysisResponse)
async def analyze_listing_risk(payload: RiskAnalysisRequest):
    """
    AI Risk Assessment endpoint inspecting catalog products or external URLs.
    """
    return execute_risk_analysis(payload.model_dump())


@router.post("/compare", response_model=CompareProductsResponse)
async def compare_products(payload: CompareProductsRequest):
    """
    AI product comparison endpoint calculating safest, best value, and overall winners.
    """
    return execute_compare_products(payload.productIds)
