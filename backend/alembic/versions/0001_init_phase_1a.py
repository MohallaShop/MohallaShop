"""Phase 1a initial schema

Revision ID: 0001_init_phase_1a
Revises:
Create Date: 2026-08-09

Creates the Phase 1a tables (users, profiles, addresses, categories, shops,
products, inventory, carts, cart_items, orders, order_items, order_state_history),
their enums, constraints, indexes, and updated_at triggers.

See docs/DATABASE/SCHEMA.md for the full specification.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM, UUID

revision: str = '0001_init_phase_1a'
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Tables that own an `updated_at` column (advanced by trigger).
_TABLES_WITH_UPDATED_AT = [
    'users',
    'user_profiles',
    'addresses',
    'shops',
    'products',
    'inventory',
    'carts',
    'cart_items',
    'orders',
]

_ORDER_STATUS = ['placed', 'pending_shop', 'accepted', 'preparing', 'ready_for_pickup',
                 'rejected', 'cancelled']


def _enum(name: str) -> ENUM:
    return ENUM(name=name, create_type=False)


def upgrade() -> None:
    # ── Enum types ─────────────────────────────────────────────
    op.execute("CREATE TYPE shop_status AS ENUM ('active', 'inactive')")
    op.execute("CREATE TYPE cart_status AS ENUM ('active', 'abandoned')")
    op.execute(f"CREATE TYPE order_status AS ENUM ({', '.join(_quoted(s) for s in _ORDER_STATUS)})")

    # ── users ──────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('phone', sa.Text),
        sa.Column('email', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )
    op.create_index('users_phone_key', 'users', ['phone'], unique=True,
                    postgresql_where=sa.text('phone IS NOT NULL'))
    op.create_index('users_email_key', 'users', ['email'], unique=True,
                    postgresql_where=sa.text('email IS NOT NULL'))

    # ── user_profiles ──────────────────────────────────────────
    op.create_table(
        'user_profiles',
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('display_name', sa.Text),
        sa.Column('avatar_url', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )

    # ── addresses ──────────────────────────────────────────────
    op.create_table(
        'addresses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('label', sa.Text),
        sa.Column('line1', sa.Text, nullable=False),
        sa.Column('line2', sa.Text),
        sa.Column('landmark', sa.Text),
        sa.Column('city', sa.Text, nullable=False),
        sa.Column('state', sa.Text, nullable=False),
        sa.Column('pincode', sa.Text, nullable=False),
        sa.Column('contact_name', sa.Text),
        sa.Column('contact_phone', sa.Text),
        sa.Column('is_default', sa.Boolean, server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('char_length(pincode) BETWEEN 3 AND 10',
                           name='addresses_pincode_len_check'),
    )
    op.create_index('ix_addresses_user_id', 'addresses', ['user_id'])

    # ── categories ─────────────────────────────────────────────
    op.create_table(
        'categories',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text, nullable=False, unique=True),
        sa.Column('slug', sa.Text, nullable=False, unique=True),
        sa.Column('parent_id', UUID(as_uuid=True),
                  sa.ForeignKey('categories.id', ondelete='SET NULL')),
        sa.Column('sort_order', sa.Integer, server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )

    # ── shops ──────────────────────────────────────────────────
    op.create_table(
        'shops',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('owner_user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('phone', sa.Text),
        sa.Column('status', _enum('shop_status'), server_default=sa.text("'active'"),
                  nullable=False),
        sa.Column('address_line1', sa.Text),
        sa.Column('address_city', sa.Text),
        sa.Column('address_state', sa.Text),
        sa.Column('address_pincode', sa.Text),
        sa.Column('latitude', sa.Numeric(9, 6)),
        sa.Column('longitude', sa.Numeric(9, 6)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('char_length(name) BETWEEN 1 AND 120', name='shops_name_len_check'),
    )
    op.create_index('ix_shops_owner_user_id', 'shops', ['owner_user_id'])
    op.create_index('ix_shops_status', 'shops', ['status'])
    op.create_index('ix_shops_address_city', 'shops', ['address_city'])

    # ── products ───────────────────────────────────────────────
    op.create_table(
        'products',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('shop_id', UUID(as_uuid=True),
                  sa.ForeignKey('shops.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category_id', UUID(as_uuid=True),
                  sa.ForeignKey('categories.id', ondelete='SET NULL')),
        sa.Column('name', sa.Text, nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('unit', sa.Text, nullable=False),
        sa.Column('image_url', sa.Text),
        sa.Column('is_active', sa.Boolean, server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('price >= 0', name='products_price_check'),
        sa.CheckConstraint('char_length(name) BETWEEN 1 AND 160', name='products_name_len_check'),
    )
    op.create_index('ix_products_shop_id', 'products', ['shop_id'])
    op.create_index('ix_products_shop_id_is_active', 'products', ['shop_id', 'is_active'])
    op.create_index('ix_products_category_id', 'products', ['category_id'])

    # ── inventory ──────────────────────────────────────────────
    op.create_table(
        'inventory',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('product_id', UUID(as_uuid=True),
                  sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('quantity_available', sa.Integer, server_default=sa.text('0'), nullable=False),
        sa.Column('low_stock_threshold', sa.Integer),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('quantity_available >= 0', name='inventory_qty_available_check'),
        sa.CheckConstraint('low_stock_threshold IS NULL OR low_stock_threshold >= 0',
                           name='inventory_low_stock_check'),
    )

    # ── carts ──────────────────────────────────────────────────
    op.create_table(
        'carts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shop_id', UUID(as_uuid=True),
                  sa.ForeignKey('shops.id', ondelete='SET NULL')),
        sa.Column('status', _enum('cart_status'), server_default=sa.text("'active'"),
                  nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )
    op.create_index('carts_active_user_uniq', 'carts', ['user_id'], unique=True,
                    postgresql_where=sa.text("status = 'active'"))

    # ── cart_items ─────────────────────────────────────────────
    op.create_table(
        'cart_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('cart_id', UUID(as_uuid=True),
                  sa.ForeignKey('carts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True),
                  sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('unit_price_snapshot', sa.Numeric(12, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('quantity >= 1', name='cart_items_quantity_check'),
        sa.CheckConstraint('unit_price_snapshot >= 0', name='cart_items_price_snapshot_check'),
        sa.UniqueConstraint('cart_id', 'product_id', name='cart_items_cart_product_uniq'),
    )
    op.create_index('ix_cart_items_cart_id', 'cart_items', ['cart_id'])

    # ── orders ─────────────────────────────────────────────────
    op.create_table(
        'orders',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_no', sa.Text, nullable=False, unique=True),
        sa.Column('customer_user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('shop_id', UUID(as_uuid=True),
                  sa.ForeignKey('shops.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', _enum('order_status'), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('delivery_fee', sa.Numeric(12, 2), server_default=sa.text('0'), nullable=False),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('notes', sa.Text),
        sa.Column('delivery_line1', sa.Text, nullable=False),
        sa.Column('delivery_line2', sa.Text),
        sa.Column('delivery_landmark', sa.Text),
        sa.Column('delivery_city', sa.Text, nullable=False),
        sa.Column('delivery_state', sa.Text, nullable=False),
        sa.Column('delivery_pincode', sa.Text, nullable=False),
        sa.Column('delivery_contact_name', sa.Text),
        sa.Column('delivery_contact_phone', sa.Text),
        sa.Column('placed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.CheckConstraint('subtotal >= 0', name='orders_subtotal_check'),
        sa.CheckConstraint('delivery_fee >= 0', name='orders_delivery_fee_check'),
        sa.CheckConstraint('total_amount >= 0', name='orders_total_check'),
        sa.CheckConstraint('total_amount = subtotal + delivery_fee',
                           name='orders_total_equals_parts'),
    )
    op.create_index('ix_orders_customer_placed', 'orders',
                    ['customer_user_id', sa.text('placed_at DESC')])
    op.create_index('ix_orders_shop_placed', 'orders', ['shop_id', sa.text('placed_at DESC')])
    op.create_index('ix_orders_status', 'orders', ['status'])

    # ── order_items ────────────────────────────────────────────
    op.create_table(
        'order_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', UUID(as_uuid=True),
                  sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True),
                  sa.ForeignKey('products.id', ondelete='SET NULL')),
        sa.Column('product_name', sa.Text, nullable=False),
        sa.Column('product_unit', sa.Text, nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('quantity', sa.Integer, nullable=False),
        sa.Column('line_total', sa.Numeric(12, 2), nullable=False),
        sa.CheckConstraint('quantity >= 1', name='order_items_quantity_check'),
        sa.CheckConstraint('unit_price >= 0', name='order_items_unit_price_check'),
        sa.CheckConstraint('line_total >= 0', name='order_items_line_total_check'),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])

    # ── order_state_history ────────────────────────────────────
    op.create_table(
        'order_state_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', UUID(as_uuid=True),
                  sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_state', _enum('order_status')),
        sa.Column('to_state', _enum('order_status'), nullable=False),
        sa.Column('actor_user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('actor_role', sa.Text),
        sa.Column('reason', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )
    op.create_index('ix_order_state_history_order_created', 'order_state_history',
                    ['order_id', 'created_at'])

    _create_updated_at_triggers(op)


def downgrade() -> None:
    _drop_updated_at_triggers(op)
    for table in (
        'order_state_history',
        'order_items',
        'orders',
        'cart_items',
        'carts',
        'inventory',
        'products',
        'shops',
        'categories',
        'addresses',
        'user_profiles',
        'users',
    ):
        op.drop_table(table)
    op.execute('DROP TYPE order_status')
    op.execute('DROP TYPE cart_status')
    op.execute('DROP TYPE shop_status')


def _quoted(value: str) -> str:
    return f"'{value}'"


def _create_updated_at_triggers(op: op) -> None:  # type: ignore[type-arg]
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in _TABLES_WITH_UPDATED_AT:
        op.execute(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION set_updated_at();"
        )


def _drop_updated_at_triggers(op: op) -> None:  # type: ignore[type-arg]
    for table in _TABLES_WITH_UPDATED_AT:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table};")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
