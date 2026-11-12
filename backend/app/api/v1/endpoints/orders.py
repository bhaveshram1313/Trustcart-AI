from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.order import OrderCreate, OrderResponse
from app.services.order_store import create_order_record, get_orders_by_user, get_order_by_id

router = APIRouter()


@router.get("", response_model=List[OrderResponse])
async def list_orders(user_id: Optional[str] = Query(None, alias="userId")):
    """
    List orders for the user.
    """
    return get_orders_by_user(user_id)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order_in: OrderCreate):
    """
    Create a new order with PayPal escrow record and tracking.
    """
    order_data = order_in.model_dump()
    return create_order_record(order_data)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str):
    """Retrieve details for a single order by ID."""
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
