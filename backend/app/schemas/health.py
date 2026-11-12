from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    message: str = "TrustCart backend is running"

