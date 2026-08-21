"""ORM models for the riders domain."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, Text, func, text
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKey, enum_values


class DeliveryStatus(StrEnum):
    ASSIGNED = 'assigned'
    PICKED_UP = 'picked_up'
    DELIVERED = 'delivered'
    FAILED = 'failed'


#: Delivery states that still occupy a rider.
ACTIVE_STATUSES = (DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP)


class Rider(Base):
    """A delivery partner. Online riders receive auto-assignments."""

    __tablename__ = 'riders'

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True
    )
    is_online: Mapped[bool] = mapped_column(
        Boolean, server_default=text('false'), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Delivery(UUIDPrimaryKey, TimestampMixin, Base):
    """One row per fulfilment attempt. A failed delivery is kept as history
    while the order is reassigned (new row); the partial unique index enforces
    at most one active delivery per order. rider_fee is snapshotted at
    assignment; config changes never rewrite past earnings."""

    __tablename__ = 'deliveries'

    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False
    )
    rider_user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('riders.user_id', ondelete='SET NULL')
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SAEnum(
            DeliveryStatus,
            name='delivery_status',
            create_type=False,
            values_callable=enum_values,
        ),
        nullable=False,
    )
    rider_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        Index('ix_deliveries_order_id', 'order_id'),
        Index('ix_deliveries_rider_status', 'rider_user_id', 'status'),
        Index(
            'uq_deliveries_one_active_per_order',
            'order_id',
            unique=True,
            postgresql_where=text("status IN ('assigned', 'picked_up')"),
        ),
    )
