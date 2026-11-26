import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend root directory is in sys.path so 'app' imports work regardless of execution cwd
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Non-blocking pre-warm of Gemini client in a background thread
    import threading
    from app.services.ai_service import prewarm_gemini_client
    threading.Thread(target=prewarm_gemini_client, daemon=True).start()
    yield


# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="TrustCart AI - Python FastAPI Backend for E-Commerce, Risk Assessment, and AI Shopping Assistant",
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS for the existing Vite frontend (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint for basic server discovery
@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
    }

# Include API v1 router containing /api/v1/health and modular endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.PORT))
    host = os.environ.get("HOST", settings.HOST)
    is_prod = os.environ.get("ENVIRONMENT") == "production" or bool(os.environ.get("RENDER"))
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=settings.DEBUG and not is_prod,
    )
