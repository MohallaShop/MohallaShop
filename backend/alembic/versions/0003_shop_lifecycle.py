"""Shop lifecycle: registration + approval + delivery fee

Revision ID: 0003_shop_lifecycle
Revises: 0002_favorite_shops
Create Date: 2026-08-20

Adds the shop registration workflow (Phase 1b):

- shop_status gains 'pending' (newly registered, awaiting admin approval)
  and 'suspended' (temporarily hidden by an admin).
- shops.address_line2 for fuller addresses.
- shops.delivery_fee — the flat fee charged per order at this shop.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0003_shop_lifecycle'
down_revision: str | Sequence[str] | None = '0002_favorite_shops'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE shop_status ADD VALUE IF NOT EXISTS 'pending'")
        op.execute("ALTER TYPE shop_status ADD VALUE IF NOT EXISTS 'suspended'")

    op.add_column('shops', sa.Column('address_line2', sa.Text(), nullable=True))
    op.add_column(
        'shops',
        sa.Column(
            'delivery_fee',
            sa.Numeric(12, 2),
            server_default=sa.text('20'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('shops', 'delivery_fee')
    op.drop_column('shops', 'address_line2')
    # PostgreSQL cannot remove values from an enum; 'pending'/'suspended' stay.
