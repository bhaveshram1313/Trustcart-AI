import json
from pathlib import Path
from typing import List, Dict, Any, Optional


def load_products_json() -> List[Dict[str, Any]]:
    # Search common candidate locations
    candidates = [
        Path(__file__).resolve().parent.parent / "data" / "products.json",
        Path(__file__).resolve().parents[4] / "src" / "data" / "products.json",
        Path("src/data/products.json"),
        Path("backend/app/data/products.json"),
    ]
    for p in candidates:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                continue
    return []


# In-memory product storage initialized from catalog JSON
_INITIAL_PRODUCTS = load_products_json()
_PRODUCTS_STORE: List[Dict[str, Any]] = list(_INITIAL_PRODUCTS)


def get_all_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    min_trust_score: int = 0,
    max_price: Optional[float] = None,
    verified_only: bool = False,
    sort_by: str = "trust-desc",
) -> List[Dict[str, Any]]:
    results = list(_PRODUCTS_STORE)

    if isinstance(search, str) and search.strip():
        q = search.strip().lower()
        results = [
            p for p in results
            if q in p.get("name", "").lower()
            or q in p.get("brand", "").lower()
            or q in p.get("category", "").lower()
            or q in p.get("shortSummary", "").lower()
            or q in p.get("description", "").lower()
            or q in p.get("seller", {}).get("name", "").lower()
        ]

    if isinstance(category, str) and category.lower() != "all":
        results = [p for p in results if p.get("category", "").lower() == category.lower()]

    if isinstance(min_trust_score, (int, float)) and min_trust_score > 0:
        results = [p for p in results if p.get("trustScore", 0) >= min_trust_score]

    if isinstance(max_price, (int, float)) and max_price > 0:
        results = [p for p in results if p.get("price", 0) <= max_price]

    if isinstance(verified_only, bool) and verified_only:
        results = [p for p in results if p.get("seller", {}).get("verified", False)]

    # Sorting
    sort_str = sort_by if isinstance(sort_by, str) else "trust-desc"
    if sort_str == "price-asc":
        results.sort(key=lambda p: p.get("price", 0))
    elif sort_str == "price-desc":
        results.sort(key=lambda p: p.get("price", 0), reverse=True)
    elif sort_str == "rating-desc":
        results.sort(key=lambda p: p.get("rating", 0), reverse=True)
    else:  # trust-desc default
        results.sort(key=lambda p: p.get("trustScore", 0), reverse=True)

    return results


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    for p in _PRODUCTS_STORE:
        if p.get("id") == product_id:
            return p
    return None


def add_product(product_data: Dict[str, Any]) -> Dict[str, Any]:
    _PRODUCTS_STORE.insert(0, product_data)
    return product_data

