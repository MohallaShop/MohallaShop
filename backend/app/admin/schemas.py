"""Admin Pydantic schemas (oversight + shop lifecycle + user roles)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.api.common import Money
from app.auth.roles import Role


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


class AdminShopStatusUpdate(BaseModel):
    """Admin-set shop status. `pending` is never a valid target — only the
    registration flow creates pending shops."""

    status: Literal['active', 'inactive', 'suspended']


class AdminRiderOut(BaseModel):
    user_id: UUID
    display_name: str | None = None
    email: str | None = None
    is_online: bool
    active_deliveries: int
    completed_deliveries: int


class AdminDashboardOut(BaseModel):
    users: int
    shops_active: int
    shops_inactive: int
    products: int
    orders_by_status: dict[str, int]


class AdminUserRolesUpdate(BaseModel):
    """Replace the user's role set. Empty = customer (the default role-less user)."""

    roles: list[Role]


class AdminUserDetailOut(BaseModel):
    id: UUID
    email: str | None = None
    phone: str | None = None
    email_confirmed: bool
    roles: list[str]


class OrdersPerDayOut(BaseModel):
    date: str  # YYYY-MM-DD (local server day)
    orders: int
    revenue: Money


class TopShopOut(BaseModel):
    shop_id: UUID
    shop_name: str
    orders: int
    revenue: Money


class AdminAnalyticsOut(BaseModel):
    orders_per_day: list[OrdersPerDayOut]
    top_shops: list[TopShopOut]
    riders_online: int


class AdminSettingsOut(BaseModel):
    """Non-secret operational flags for the admin settings screen."""

    payments_enabled: bool
    razorpay_configured: bool
    supabase_admin_configured: bool
    rider_delivery_fee: Money
