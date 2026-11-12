import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

_ORDERS_STORE: List[Dict[str, Any]] = []


def create_order_record(payload: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    order_id = payload.get("id") or f"TC-{random.randint(100000, 999999)}"
    record = {
        "id": order_id,
        "userId": payload.get("userId") or "usr_demo",
        "items": payload.get("items", []),
        "totalAmount": payload.get("totalAmount", 0.0),
        "subtotal": payload.get("subtotal") or payload.get("totalAmount", 0.0),
        "shippingAddress": payload.get("shippingAddress", ""),
        "paymentMethod": payload.get("paymentMethod", "paypal"),
        "paypalTransactionId": payload.get("paypalTransactionId") or f"PAYID-SB-{random.randint(100000, 999999)}",
        "status": "paid",
        "trackingNumber": f"TRK-{random.randint(10000000, 99999999)}",
        "date": now,
        "createdAt": now,
        "timeline": payload.get("timeline") or [
            {"step": "Order & PayPal Escrow Confirmed", "date": "Just now", "completed": True},
            {"step": "AI Seller Verification Passed", "date": "Just now", "completed": True},
            {"step": "Preparing Insured Dispatch", "date": "Pending", "completed": False},
            {"step": "Estimated Delivery (2–4 Days)", "date": "Scheduled", "completed": False},
        ],
    }
    _ORDERS_STORE.insert(0, record)
    return record


def get_orders_by_user(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if not user_id:
        return list(_ORDERS_STORE)
    return [o for o in _ORDERS_STORE if o.get("userId") == user_id]


def get_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
    for o in _ORDERS_STORE:
        if o.get("id") == order_id:
            return o
    return None

