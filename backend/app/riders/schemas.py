"""Pydantic schemas for the riders domain."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.common import Money


class RiderStateOut(BaseModel):
    user_id: UUID
    is_online: bool
    active_deliveries: int


class RiderDeliveryOut(BaseModel):
    id: UUID
    order_id: UUID
    order_no: str
    shop_name: str
    status: str
    rider_fee: Money | None = None
    total_amount: Money
    drop_line1: str
    drop_city: str
    drop_pincode: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    assigned_at: datetime | None = None
    picked_up_at: datetime | None = None
    completed_at: datetime | None = None
    notes: str | None = None


class RiderDashboardOut(BaseModel):
    is_online: bool
    active_count: int
    completed_today: int
    earned_today: Money


class EarningDayOut(BaseModel):
    date: str  # YYYY-MM-DD
    deliveries: int
    fees: Money


class RiderEarningsOut(BaseModel):
    lifetime_deliveries: int
    lifetime_fees: Money
    today_fees: Money
    per_day: list[EarningDayOut]


class FailDeliveryIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
