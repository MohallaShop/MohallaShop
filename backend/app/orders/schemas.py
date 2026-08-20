"""Pydantic schemas for the orders domain."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.common import Money


class OrderItemOut(BaseModel):
    product_id: UUID | None = None
    product_name: str
    product_unit: str
    unit_price: Money
    quantity: int
    line_total: Money


class OrderHistoryOut(BaseModel):
    from_state: str | None = None
    to_state: str
    actor_role: str | None = None
    reason: str | None = None
    created_at: datetime


class DeliveryAddressOut(BaseModel):
    line1: str
    line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str
    contact_name: str | None = None
    contact_phone: str | None = None


class OrderCustomerOut(BaseModel):
    user_id: UUID
    display_name: str | None = None


class OrderSummary(BaseModel):
    id: UUID
    order_no: str
    status: str
    total_amount: Money
    item_count: int
    placed_at: datetime


class OrderDetail(OrderSummary):
    shop_id: UUID
    shop_name: str
    customer: OrderCustomerOut | None = None
    subtotal: Money
    delivery_fee: Money
    notes: str | None = None
    delivery_address: DeliveryAddressOut
    items: list[OrderItemOut]
    history: list[OrderHistoryOut]


class CreateOrder(BaseModel):
    address_id: UUID
    notes: str | None = Field(default=None, max_length=500)


class RejectOrder(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
