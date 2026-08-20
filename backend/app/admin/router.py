"""Admin HTTP routes (read-only oversight)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service
from app.admin.schemas import (
    AdminDashboardOut,
    AdminOrderOut,
    AdminProductOut,
    AdminShopOut,
    AdminUserOut,
)
from app.api.common import Page, PageParams, build_pagination
from app.auth.roles import Role
from app.core.deps import Principal, get_db, require_roles

router = APIRouter(prefix='/admin', tags=['admin'])

_admin = require_roles(Role.ADMIN)


@router.get('/dashboard', response_model=AdminDashboardOut)
async def admin_dashboard(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> AdminDashboardOut:
    return await service.dashboard(session)


@router.get('/users', response_model=Page[AdminUserOut])
async def admin_users(
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> Page[AdminUserOut]:
    items, total = await service.list_users(
        session, page=pagination.page, page_size=pagination.page_size
    )
    return Page[AdminUserOut](
        items=[AdminUserOut.model_validate(u) for u in items],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/shops', response_model=Page[AdminShopOut])
async def admin_shops(
    q: str | None = Query(default=None),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> Page[AdminShopOut]:
    rows, total = await service.list_shops_admin(
        session, page=pagination.page, page_size=pagination.page_size, q=q
    )
    return Page[AdminShopOut](
        items=[
            AdminShopOut(
                id=shop.id,
                owner_user_id=shop.owner_user_id,
                name=shop.name,
                status=shop.status.value,
                city=shop.address_city,
                product_count=count,
                created_at=shop.created_at,
            )
            for shop, count in rows
        ],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/products', response_model=Page[AdminProductOut])
async def admin_products(
    q: str | None = Query(default=None),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> Page[AdminProductOut]:
    rows, total = await service.list_products_admin(
        session, page=pagination.page, page_size=pagination.page_size, q=q
    )
    return Page[AdminProductOut](
        items=[
            AdminProductOut(
                id=p.id,
                shop_id=p.shop_id,
                name=p.name,
                price=p.price,
                unit=p.unit,
                is_active=p.is_active,
                quantity_available=qty,
            )
            for p, qty in rows
        ],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/orders', response_model=Page[AdminOrderOut])
async def admin_orders(
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> Page[AdminOrderOut]:
    items, total = await service.list_orders_admin(
        session, page=pagination.page, page_size=pagination.page_size
    )
    return Page[AdminOrderOut](
        items=[AdminOrderOut.model_validate(o) for o in items],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )
