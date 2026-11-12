import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_store import get_all_products, get_product_by_id, add_product

router = APIRouter()


@router.get("", response_model=List[ProductResponse])
async def list_products(
    search: Optional[str] = Query(None, description="Search term for product name or category"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_trust_score: int = Query(0, ge=0, le=100, alias="minTrustScore"),
    max_price: Optional[float] = Query(None, alias="maxPrice"),
    verified_only: bool = Query(False, alias="verifiedOnly"),
    sort_by: str = Query("trust-desc", alias="sortBy"),
):
    """
    List catalog products with filtering, search, and sorting.
    """
    products = get_all_products(
        search=search,
        category=category,
        min_trust_score=min_trust_score,
        max_price=max_price,
        verified_only=verified_only,
        sort_by=sort_by,
    )
    return products


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Retrieve details for a single product by ID."""
    product = get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate):
    """Create a new product listing."""
    now = datetime.now(timezone.utc).isoformat()
    product_id = f"sp_{uuid.uuid4().hex[:12]}"
    product_dict = {
        "id": product_id,
        "name": product_in.name,
        "category": product_in.category,
        "description": product_in.description or product_in.name,
        "shortSummary": product_in.description or product_in.name,
        "price": product_in.price,
        "originalPrice": product_in.price,
        "marketMedianPrice": product_in.price,
        "imageUrl": product_in.imageUrl,
        "image": product_in.imageUrl,
        "specs": product_in.specs,
        "stock": product_in.stock,
        "trustScore": 89,
        "riskLevel": "safe",
        "rating": 4.8,
        "reviewCount": 1,
        "verifiedPurchasePct": 100,
        "aiVerdict": "Published listing verified by TrustCart AI Seller engine.",
        "seller": {
            "name": "TrustCart Seller",
            "verified": True,
            "rating": 4.9,
            "returnWindowDays": 30,
        },
        "createdAt": now,
        "updatedAt": now,
    }
    return add_product(product_dict)
