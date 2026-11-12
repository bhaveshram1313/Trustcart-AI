from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint indicating backend availability."""
    return {"status": "ok", "message": "TrustCart backend is running"}
