import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.services.order_store import _ORDERS_STORE
from app.services.paypal_service import _CAPTURED_ORDERS

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_stores():
    _ORDERS_STORE.clear()
    _CAPTURED_ORDERS.clear()
    yield
    _ORDERS_STORE.clear()
    _CAPTURED_ORDERS.clear()


def test_paypal_config_endpoint():
    """Verify that the public PayPal config endpoint returns client ID and environment safely."""
    response = client.get("/api/v1/payments/paypal/config")
    assert response.status_code == 200
    data = response.json()
    assert "clientId" in data
    assert data["currency"] == "USD"
    assert data["environment"] == "sandbox"
    # Ensure no secret keys are leaked
    assert "clientSecret" not in data
    assert "secret" not in data


def test_paypal_create_order_validation():
    """Verify input validation for PayPal order creation."""
    # Negative amount
    resp = client.post("/api/v1/payments/paypal/create-order", json={"amount": -10.0})
    assert resp.status_code in (400, 422)

    # Zero amount
    resp = client.post("/api/v1/payments/paypal/create-order", json={"amount": 0})
    assert resp.status_code in (400, 422)

    # Non-USD currency
    resp = client.post("/api/v1/payments/paypal/create-order", json={"amount": 50.0, "currency": "EUR"})
    assert resp.status_code == 400
    assert "Only USD payments are supported" in resp.json()["detail"]

    # Amount mismatch between subtotal + shipping + tax and total amount
    resp = client.post(
        "/api/v1/payments/paypal/create-order",
        json={
            "amount": 100.00,
            "subtotal": 50.00,
            "shipping": 10.00,
            "tax": 5.00, # Sum is 65, not 100
        }
    )
    assert resp.status_code == 400
    assert "Amount mismatch" in resp.json()["detail"]


def test_create_order_requires_paypal_transaction_id():
    """Verify that an order cannot be created with a fake or missing PayPal transaction ID."""
    order_data = {
        "userId": "user_buyer_123",
        "items": [
            {"productId": "prod_1", "name": "Wireless Headphones", "price": 99.99, "quantity": 1}
        ],
        "totalAmount": 99.99,
        "shippingAddress": "123 Main St, Springfield IL 62701",
        "paymentMethod": "PayPal",
        # paypalTransactionId is intentionally omitted
    }
    resp = client.post("/api/v1/orders", json=order_data)
    assert resp.status_code == 400
    assert "paypalTransactionId" in resp.json()["detail"]


def test_order_creation_after_successful_capture():
    """Verify order creation and proper storage after verified PayPal capture."""
    order_data = {
        "userId": "user_buyer_456",
        "items": [
            {"productId": "prod_10", "name": "Mechanical Keyboard", "price": 120.00, "quantity": 1}
        ],
        "total": 129.60,
        "subtotal": 120.00,
        "shipping": 0.00,
        "tax": 9.60,
        "shippingAddress": "456 Oak Avenue, Austin TX 78701",
        "paymentMethod": "PayPal",
        "paypalTransactionId": "CAPTURE-SB-9876543210",
        "paypalOrderId": "ORD-SB-1234567890",
    }
    resp = client.post("/api/v1/orders", json=order_data)
    assert resp.status_code == 201
    created = resp.json()

    assert created["id"].startswith("TC-")
    assert created["userId"] == "user_buyer_456"
    assert created["paypalTransactionId"] == "CAPTURE-SB-9876543210"
    assert created["paypalOrderId"] == "ORD-SB-1234567890"
    assert created["status"] == "paid"
    assert created["paymentStatus"] == "COMPLETED"
    assert created["total"] == 129.60
    assert created["totalAmount"] == 129.60
    assert len(created["timeline"]) > 0


def test_duplicate_order_submission_idempotency():
    """Verify that duplicate order submissions with the same transaction ID return the existing order without duplicating."""
    order_data = {
        "userId": "user_buyer_789",
        "items": [
            {"productId": "prod_20", "name": "Smart Watch", "price": 199.99, "quantity": 1}
        ],
        "totalAmount": 215.99,
        "shippingAddress": "789 Pine Rd, Seattle WA 98101",
        "paymentMethod": "PayPal",
        "paypalTransactionId": "CAPTURE-SB-UNIQUE-777",
    }
    # First submission
    resp1 = client.post("/api/v1/orders", json=order_data)
    assert resp1.status_code == 201
    order1 = resp1.json()

    # Second submission (e.g., user clicked retry or duplicate event)
    resp2 = client.post("/api/v1/orders", json=order_data)
    assert resp2.status_code == 201
    order2 = resp2.json()

    # Must be the exact same order ID
    assert order1["id"] == order2["id"]
    assert order1["paypalTransactionId"] == order2["paypalTransactionId"]

    # Verify orders store contains only ONE record, not two
    user_orders = client.get("/api/v1/orders?userId=user_buyer_789").json()
    assert len(user_orders) == 1


def test_user_order_isolation():
    """Verify that user order retrieval is strictly isolated per userId."""
    client.post("/api/v1/orders", json={
        "userId": "user_alice",
        "items": [{"productId": "p1", "name": "Item A", "price": 10.0, "quantity": 1}],
        "total": 10.0,
        "shippingAddress": "123 Alice St",
        "paypalTransactionId": "TX-ALICE-1",
    })

    client.post("/api/v1/orders", json={
        "userId": "user_bob",
        "items": [{"productId": "p2", "name": "Item B", "price": 20.0, "quantity": 1}],
        "total": 20.0,
        "shippingAddress": "456 Bob St",
        "paypalTransactionId": "TX-BOB-1",
    })

    alice_orders = client.get("/api/v1/orders?userId=user_alice").json()
    assert len(alice_orders) == 1
    assert alice_orders[0]["userId"] == "user_alice"

    bob_orders = client.get("/api/v1/orders?userId=user_bob").json()
    assert len(bob_orders) == 1
    assert bob_orders[0]["userId"] == "user_bob"
