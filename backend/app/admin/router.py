"""Admin HTTP routes: read oversight, shop lifecycle, and user role management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import service
from app.admin.schemas import (
    AdminAnalyticsOut,
    AdminDashboardOut,
    AdminOrderOut,
    AdminProductOut,
    AdminRiderOut,
    AdminSettingsOut,
    AdminShopOut,
    AdminShopStatusUpdate,
    AdminUserDetailOut,
    AdminUserOut,
    AdminUserRolesUpdate,
)
from app.api.common import Page, PageParams, build_pagination
from app.auth.roles import Role
from app.core.config import Settings
from app.core.deps import Principal, get_db, get_settings, require_roles
from app.shops.models import ShopStatus

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


@router.patch('/shops/{shop_id}/status', response_model=AdminShopOut)
async def admin_set_shop_status(
    shop_id: UUID,
    data: AdminShopStatusUpdate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> AdminShopOut:
    """Approve (→ active), suspend or close a shop. Governed by the shop
    status transition map in the admin service."""
    shop, product_count = await service.set_shop_status(
        session, shop_id, ShopStatus(data.status)
    )
    return AdminShopOut(
        id=shop.id,
        owner_user_id=shop.owner_user_id,
        name=shop.name,
        status=shop.status.value,
        city=shop.address_city,
        product_count=product_count,
        created_at=shop.created_at,
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


@router.get('/riders', response_model=Page[AdminRiderOut])
async def admin_riders(
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> Page[AdminRiderOut]:
    items, total = await service.list_riders_admin(
        session, page=pagination.page, page_size=pagination.page_size
    )
    return Page[AdminRiderOut](
        items=items,
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


# ── User management (Supabase Auth Admin API) ──────────────────
@router.get('/users/{user_id}', response_model=AdminUserDetailOut)
async def admin_user_detail(
    user_id: UUID,
    settings: Settings = Depends(get_settings),
    principal: Principal = Depends(_admin),
) -> AdminUserDetailOut:
    return await service.get_user_detail(settings, user_id)


@router.put('/users/{user_id}/roles', response_model=AdminUserDetailOut)
async def admin_update_user_roles(
    user_id: UUID,
    data: AdminUserRolesUpdate,
    settings: Settings = Depends(get_settings),
    principal: Principal = Depends(_admin),
) -> AdminUserDetailOut:
    """Replace a user's roles. The user is force-signed-out (roles are JWT
    claims); they must sign in again to act with the new roles. Only a
    super-admin may grant or remove the super-admin role."""
    return await service.update_user_roles(settings, user_id, data, actor=principal)


# ── Analytics + settings ───────────────────────────────────────
@router.get('/analytics', response_model=AdminAnalyticsOut)
async def admin_analytics(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_admin),
) -> AdminAnalyticsOut:
    return await service.analytics(session)


@router.get('/settings', response_model=AdminSettingsOut)
async def admin_settings(
    settings: Settings = Depends(get_settings),
    principal: Principal = Depends(_admin),
) -> AdminSettingsOut:
    return service.get_admin_settings(settings)
