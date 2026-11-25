"""
FastAPI application module alias for Render / Uvicorn deployments targeting `app.main:app`.
"""
import sys
from pathlib import Path

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: F401
