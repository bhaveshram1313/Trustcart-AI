from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, products, orders, ai

api_router = APIRouter()

# Health Check (GET /api/v1/health)
api_router.include_router(health.router, tags=["Health"])

# Future Feature Endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI & Risk Assessment"])

