import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath("backend"))

from app.schemas.order import OrderCreate, OrderResponse
from app.services.order_store import create_order_record, get_orders_by_user, _ORDERS_STORE
from app.api.v1.endpoints.payments import get_paypal_public_config
from app.services.paypal_service import create_paypal_order
from fastapi import HTTPException

print("STARTING UNIT TESTS...", flush=True)

async def main():
    # 1. Config endpoint
    cfg = await get_paypal_public_config()
    assert "clientId" in cfg
    assert cfg["currency"] == "USD"
    assert cfg["environment"] == "sandbox"
    print("PASS: Config", flush=True)

    # 2. Negative amount validation
    try:
        await create_paypal_order(-10.0)
        print("FAIL: Negative amount allowed", flush=True)
    except HTTPException as e:
        assert e.status_code == 400
        print("PASS: Rejects negative amount", flush=True)

    # 3. Breakdown mismatch validation
    try:
        await create_paypal_order(amount=100.0, subtotal=50.0, shipping=10.0, tax=5.0)
        print("FAIL: Mismatch allowed", flush=True)
    except HTTPException as e:
        assert e.status_code == 400
        print("PASS: Rejects breakdown mismatch", flush=True)

    # 4. Require real paypalTransactionId for confirmed order
    try:
        create_order_record({
            "userId": "u1",
            "items": [],
            "totalAmount": 50.0,
            "paymentMethod": "PayPal",
        })
        print("FAIL: Missing txId allowed", flush=True)
    except HTTPException as e:
        assert e.status_code == 400
        print("PASS: Requires paypalTransactionId", flush=True)

    # 5. Successful order creation after verified capture
    order = create_order_record({
        "userId": "u1",
        "items": [{"productId": "p1", "name": "Item 1", "price": 40.0, "quantity": 1}],
        "total": 43.20,
        "subtotal": 40.0,
        "tax": 3.20,
        "shipping": 0.0,
        "shippingAddress": "123 Test St",
        "paymentMethod": "PayPal",
        "paypalTransactionId": "CAPTURE-12345",
        "paypalOrderId": "ORDER-12345",
    })
    assert order["status"] == "paid"
    assert order["paymentStatus"] == "COMPLETED"
    assert order["total"] == 43.20
    assert order["paypalTransactionId"] == "CAPTURE-12345"
    print("PASS: Order creation and storage", flush=True)

    # 6. Duplicate order submission idempotency
    order_dup = create_order_record({
        "userId": "u1",
        "items": [{"productId": "p1", "name": "Item 1", "price": 40.0, "quantity": 1}],
        "total": 43.20,
        "paymentMethod": "PayPal",
        "paypalTransactionId": "CAPTURE-12345",
    })
    assert order_dup["id"] == order["id"]
    user_orders = get_orders_by_user("u1")
    assert len(user_orders) == 1
    print("PASS: Duplicate submission idempotency (No duplicates)", flush=True)

    # 7. User isolation
    create_order_record({
        "userId": "u2",
        "items": [],
        "total": 10.0,
        "paymentMethod": "PayPal",
        "paypalTransactionId": "CAPTURE-99999",
    })
    assert len(get_orders_by_user("u1")) == 1
    assert len(get_orders_by_user("u2")) == 1
    print("PASS: User isolation", flush=True)

    # 8. Live PayPal Sandbox Order Creation with HATEOAS approveUrl check
    try:
        live_order = await create_paypal_order(
            amount=25.00,
            subtotal=25.00,
            shipping=0.00,
            tax=0.00,
            items=[{"name": "Test Item", "price": 25.00, "quantity": 1}]
        )
        assert live_order.get("paypalOrderId") is not None
        assert live_order.get("status") == "CREATED"
        assert live_order.get("approveUrl") is not None
        assert "checkoutnow" in live_order.get("approveUrl")
        assert len(live_order.get("links", [])) > 0
        print(f"PASS: Live PayPal Sandbox Order Creation with approveUrl ({live_order.get('paypalOrderId')})", flush=True)
    except Exception as e:
        print(f"FAIL: Live order creation: {e}", flush=True)
        raise

    print("\nALL 8 CORE TESTS PASSED!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
