"""Admin Pydantic schemas (read-only oversight)."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.api.common import Money


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phone: str | None = None
    email: str | None = None
    created_at: datetime


class AdminShopOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_user_id: UUID
    name: str
    status: str
    city: str | None = None
    product_count: int
    created_at: datetime


class AdminOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_no: str
    status: str
    total_amount: Money
    customer_user_id: UUID
    shop_id: UUID
    placed_at: datetime


class AdminProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shop_id: UUID
    name: str
    price: Money
    unit: str
    is_active: bool
    quantity_available: int


class AdminDashboardOut(BaseModel):
    users: int
    shops_active: int
    shops_inactive: int
    products: int
    orders_by_status: dict[str, int]
