"""TrustCart AI FastAPI Backend Application Package."""
import sys
from pathlib import Path

# Ensure backend root is in sys.path so `uvicorn app:app` resolves seamlessly
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from main import app  # noqa: F401
except ImportError:
    pass
