"""Orders domain HTTP routes: customer checkout + shopkeeper order handling."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.common import Page, PageParams, build_pagination
from app.auth.roles import Role
from app.core.deps import Principal, get_db, require_roles
from app.core.rate_limit import limiter
from app.orders import service
from app.orders.models import Order, OrderStatus
from app.orders.schemas import CreateOrder, OrderDetail, OrderSummary, RejectOrder

router = APIRouter()

_customer = require_roles(Role.CUSTOMER)
_shopkeeper = require_roles(Role.SHOPKEEPER)


def _summary(order: Order, item_count: int) -> OrderSummary:
    return OrderSummary(
        id=order.id,
        order_no=order.order_no,
        status=order.status.value,
        total_amount=order.total_amount,
        item_count=item_count,
        placed_at=order.placed_at,
    )


# ── Customer ───────────────────────────────────────────────────
@router.post('/orders', response_model=OrderDetail, status_code=status.HTTP_201_CREATED)
@limiter.limit('10/minute')
async def create_order(
    request: Request,
    data: CreateOrder,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> OrderDetail:
    return await service.create_order(session, principal, data.address_id, data.notes)


@router.get('/orders', response_model=Page[OrderSummary])
async def list_my_orders(
    status_filter: OrderStatus | None = Query(default=None, alias='status'),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> Page[OrderSummary]:
    pairs, total = await service.list_customer_orders(
        session,
        principal,
        page=pagination.page,
        page_size=pagination.page_size,
        status=status_filter,
    )
    return Page[OrderSummary](
        items=[_summary(order, count) for order, count in pairs],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/orders/{order_id}', response_model=OrderDetail)
async def get_my_order(
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> OrderDetail:
    return await service.get_customer_order(session, principal, order_id)


@router.post('/orders/{order_id}/cancel', response_model=OrderDetail)
@limiter.limit('20/minute')
async def cancel_my_order(
    request: Request,
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> OrderDetail:
    return await service.cancel_order(session, principal, order_id)


# ── Shopkeeper ─────────────────────────────────────────────────
@router.get('/shopkeeper/orders', response_model=Page[OrderSummary])
async def list_shop_orders(
    status_filter: OrderStatus | None = Query(default=None, alias='status'),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> Page[OrderSummary]:
    pairs, total = await service.list_shop_orders(
        session,
        principal,
        page=pagination.page,
        page_size=pagination.page_size,
        status=status_filter,
    )
    return Page[OrderSummary](
        items=[_summary(order, count) for order, count in pairs],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/shopkeeper/orders/{order_id}', response_model=OrderDetail)
async def get_shop_order(
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> OrderDetail:
    return await service.get_shop_order(session, principal, order_id)


@router.post('/shopkeeper/orders/{order_id}/accept', response_model=OrderDetail)
@limiter.limit('60/minute')
async def accept_order(
    request: Request,
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> OrderDetail:
    return await service.accept(session, principal, order_id)


@router.post('/shopkeeper/orders/{order_id}/reject', response_model=OrderDetail)
@limiter.limit('60/minute')
async def reject_order(
    request: Request,
    order_id: UUID,
    data: RejectOrder,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> OrderDetail:
    return await service.reject(session, principal, order_id, data.reason)


@router.post('/shopkeeper/orders/{order_id}/preparing', response_model=OrderDetail)
@limiter.limit('60/minute')
async def preparing_order(
    request: Request,
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> OrderDetail:
    return await service.preparing(session, principal, order_id)


@router.post('/shopkeeper/orders/{order_id}/ready', response_model=OrderDetail)
@limiter.limit('60/minute')
async def ready_order(
    request: Request,
    order_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> OrderDetail:
    return await service.ready(session, principal, order_id)
