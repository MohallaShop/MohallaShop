"""Riders and deliveries

Revision ID: 0004_riders_deliveries
Revises: 0003_shop_lifecycle
Create Date: 2026-08-20

Phase 1b rider flow:

- order_status gains 'out_for_delivery' and 'delivered'.
- riders: one row per delivery partner (online/offline flag).
- deliveries: one row per fulfilment attempt; a failed delivery can be
  reassigned, so uniqueness is partial — at most one *active* (assigned or
  picked_up) delivery per order. `rider_fee` is snapshotted at assignment so
  later config changes never rewrite history.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM, UUID

revision: str = '0004_riders_deliveries'
down_revision: str | Sequence[str] | None = '0003_shop_lifecycle'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery'")
        op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered'")

    op.execute(
        "CREATE TYPE delivery_status AS ENUM ('assigned', 'picked_up', 'delivered', 'failed')"
    )

    op.create_table(
        'riders',
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('is_online', sa.Boolean, server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )

    op.create_table(
        'deliveries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('order_id', UUID(as_uuid=True),
                  sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rider_user_id', UUID(as_uuid=True),
                  sa.ForeignKey('riders.user_id', ondelete='SET NULL')),
        sa.Column('status', ENUM('assigned', 'picked_up', 'delivered', 'failed',
                                 name='delivery_status', create_type=False),
                  nullable=False),
        sa.Column('rider_fee', sa.Numeric(12, 2)),
        sa.Column('assigned_at', sa.DateTime(timezone=True)),
        sa.Column('picked_up_at', sa.DateTime(timezone=True)),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
    )
    op.create_index('ix_deliveries_rider_status', 'deliveries', ['rider_user_id', 'status'])
    op.create_index('ix_deliveries_order_id', 'deliveries', ['order_id'])
    # At most one active delivery per order (failed attempts stay as history).
    op.create_index(
        'uq_deliveries_one_active_per_order',
        'deliveries',
        ['order_id'],
        unique=True,
        postgresql_where=sa.text("status IN ('assigned', 'picked_up')"),
    )


def downgrade() -> None:
    op.drop_index('uq_deliveries_one_active_per_order', table_name='deliveries')
    op.drop_index('ix_deliveries_order_id', table_name='deliveries')
    op.drop_index('ix_deliveries_rider_status', table_name='deliveries')
    op.drop_table('deliveries')
    op.drop_table('riders')
    op.execute('DROP TYPE delivery_status')
    # PostgreSQL cannot remove values from an enum; 'out_for_delivery'/'delivered' stay.
