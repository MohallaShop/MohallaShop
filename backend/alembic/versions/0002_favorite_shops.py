"""Favorite shops table

Revision ID: 0002_favorite_shops
Revises: 0001_init_phase_1a
Create Date: 2026-08-11

Adds a per-customer saved-shops table. One row per (user, shop) pair.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = '0002_favorite_shops'
down_revision: str | Sequence[str] | None = '0001_init_phase_1a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'favorite_shops',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shop_id', UUID(as_uuid=True),
                  sa.ForeignKey('shops.id', ondelete='CASCADE'), nullable=False),
        sa.UniqueConstraint('user_id', 'shop_id', name='favorite_shops_user_shop_uniq'),
    )
    op.create_index('ix_favorite_shops_user_id', 'favorite_shops', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_favorite_shops_user_id', table_name='favorite_shops')
    op.drop_table('favorite_shops')
