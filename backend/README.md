# TrustCart AI — Python FastAPI Backend

FastAPI backend service powering TrustCart AI's e-commerce catalog, seller product management, AI shopping assistant, and listing risk assessment pipelines.

---

## Getting Started

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Virtual environment tool (`venv` or `conda`)

### 2. Setup Virtual Environment

Navigate to the `backend` folder:

```bash
cd backend
python -m venv .venv
```

Activate the environment:
- **Windows (PowerShell)**: `.\.venv\Scripts\Activate.ps1`
- **Windows (CMD)**: `.\.venv\Scripts\activate.bat`
- **macOS / Linux**: `source .venv/bin/activate`

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Review and adjust variables in `.env` as needed. The defaults are pre-configured to communicate with the Vite frontend running at `http://localhost:5173`.

### 5. Run Development Server

```bash
uvicorn main:app --reload --port 8000
```
Or directly:
```bash
python main.py
```

- **Health check endpoint**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py              # Environment settings & CORS assembly
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py      # v1 router aggregating all endpoints
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── health.py  # Health check (GET /api/v1/health)
│   │           ├── auth.py    # Authentication routes
│   │           ├── products.py# Product catalog & seller management
│   │           ├── orders.py  # Order creation & history
│   │           └── ai.py      # AI assistant & risk analysis endpoints
│   ├── core/                  # Security utilities & password hashing
│   │   ├── __init__.py
│   │   └── security.py
│   ├── schemas/               # Pydantic validation schemas
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── auth.py
│   │   ├── product.py
│   │   ├── order.py
│   │   └── ai.py
│   └── services/              # Business logic layers (AI & risk calculation)
│       ├── __init__.py
│       ├── ai_service.py
│       └── risk_service.py
├── .env.example               # Safe environment variable template
├── .gitignore
├── requirements.txt           # Python package dependencies
├── main.py                    # Application entry point with CORS
└── README.md                  # Backend documentation
```

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root server status and documentation link |
| `GET` | `/api/v1/health` | Service health check (`{"status": "ok", "message": "TrustCart backend is running"}`) |
| `POST` | `/api/v1/auth/register` | User registration placeholder |
| `POST` | `/api/v1/auth/login` | User login & JWT issuance placeholder |
| `GET` | `/api/v1/auth/me` | Current user profile |
| `GET` | `/api/v1/products` | Catalog listing with filters |
| `GET` | `/api/v1/products/{id}` | Single product details |
| `POST` | `/api/v1/products` | Seller product creation |
| `PUT` | `/api/v1/products/{id}` | Seller product update |
| `DELETE` | `/api/v1/products/{id}` | Seller product removal |
| `GET` | `/api/v1/orders` | User order history |
| `POST` | `/api/v1/orders` | Create order |
| `POST` | `/api/v1/ai/assistant` | AI shopping query recommendations |
| `POST` | `/api/v1/ai/risk-analysis` | Listing risk score and anomaly inspection |
| `POST` | `/api/v1/ai/compare` | Multi-product comparison & AI verdict |

