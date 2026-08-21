"""Orders domain: order header, snapshotted items, immutable state history."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    func,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.db.mixins import TimestampMixin, UUIDPrimaryKey, enum_values


class OrderStatus(StrEnum):
    """Order lifecycle states (see SCHEMA §6)."""

    PLACED = 'placed'  # reserved (creation collapses to PENDING_SHOP)
    PENDING_SHOP = 'pending_shop'
    ACCEPTED = 'accepted'
    PREPARING = 'preparing'
    READY_FOR_PICKUP = 'ready_for_pickup'
    OUT_FOR_DELIVERY = 'out_for_delivery'
    DELIVERED = 'delivered'
    REJECTED = 'rejected'
    CANCELLED = 'cancelled'


class Order(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = 'orders'

    order_no: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    customer_user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False
    )
    shop_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('shops.id', ondelete='RESTRICT'), nullable=False
    )
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name='order_status', create_type=False, values_callable=enum_values),
        nullable=False,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), server_default=text('0'), nullable=False
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    # Delivery address snapshot (immutable copy of the chosen address).
    delivery_line1: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_line2: Mapped[str | None] = mapped_column(Text)
    delivery_landmark: Mapped[str | None] = mapped_column(Text)
    delivery_city: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_state: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_pincode: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_contact_name: Mapped[str | None] = mapped_column(Text)
    delivery_contact_phone: Mapped[str | None] = mapped_column(Text)

    placed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    items: Mapped[list[OrderItem]] = relationship(
        back_populates='order', lazy='raise_on_sql', cascade='all, delete-orphan'
    )
    history: Mapped[list[OrderStateHistory]] = relationship(
        back_populates='order', lazy='raise_on_sql', cascade='all, delete-orphan'
    )

    __table_args__ = (
        CheckConstraint('subtotal >= 0', name='orders_subtotal_check'),
        CheckConstraint('delivery_fee >= 0', name='orders_delivery_fee_check'),
        CheckConstraint('total_amount >= 0', name='orders_total_check'),
        CheckConstraint('total_amount = subtotal + delivery_fee', name='orders_total_equals_parts'),
        Index('ix_orders_customer_placed', 'customer_user_id', text('placed_at DESC')),
        Index('ix_orders_shop_placed', 'shop_id', text('placed_at DESC')),
        Index('ix_orders_status', 'status'),
    )


class OrderItem(UUIDPrimaryKey, Base):
    __tablename__ = 'order_items'

    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False
    )
    product_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('products.id', ondelete='SET NULL')
    )
    product_name: Mapped[str] = mapped_column(Text, nullable=False)
    product_unit: Mapped[str] = mapped_column(Text, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    order: Mapped[Order] = relationship(back_populates='items', lazy='raise_on_sql')

    __table_args__ = (
        CheckConstraint('quantity >= 1', name='order_items_quantity_check'),
        CheckConstraint('unit_price >= 0', name='order_items_unit_price_check'),
        CheckConstraint('line_total >= 0', name='order_items_line_total_check'),
        Index('ix_order_items_order_id', 'order_id'),
    )


class OrderStateHistory(UUIDPrimaryKey, Base):
    __tablename__ = 'order_state_history'

    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('orders.id', ondelete='CASCADE'), nullable=False
    )
    from_state: Mapped[OrderStatus | None] = mapped_column(
        SAEnum(OrderStatus, name='order_status', create_type=False, values_callable=enum_values)
    )
    to_state: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name='order_status', create_type=False, values_callable=enum_values),
        nullable=False,
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL')
    )
    actor_role: Mapped[str | None] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    order: Mapped[Order] = relationship(back_populates='history', lazy='raise_on_sql')

    __table_args__ = (Index('ix_order_state_history_order_created', 'order_id', 'created_at'),)
