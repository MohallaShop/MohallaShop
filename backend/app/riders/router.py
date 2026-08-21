"""Riders domain HTTP routes: availability, deliveries, earnings."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.common import Page, PageParams, build_pagination
from app.auth.roles import Role
from app.core.config import Settings
from app.core.deps import Principal, get_db, get_settings, require_roles
from app.core.rate_limit import limiter
from app.riders import service
from app.riders.models import DeliveryStatus
from app.riders.schemas import (
    FailDeliveryIn,
    RiderDashboardOut,
    RiderDeliveryOut,
    RiderEarningsOut,
    RiderStateOut,
)

router = APIRouter()

_rider = require_roles(Role.RIDER)


@router.post('/rider/online', response_model=RiderStateOut)
@limiter.limit('30/minute')
async def go_online(
    request: Request,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
    settings: Settings = Depends(get_settings),
) -> RiderStateOut:
    return await service.set_online(session, principal, service.fee_from_settings(settings))


@router.post('/rider/offline', response_model=RiderStateOut)
@limiter.limit('30/minute')
async def go_offline(
    request: Request,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
) -> RiderStateOut:
    return await service.set_offline(session, principal)


@router.get('/rider/dashboard', response_model=RiderDashboardOut)
async def rider_dashboard(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
) -> RiderDashboardOut:
    return await service.dashboard(session, principal)


@router.get('/rider/deliveries', response_model=Page[RiderDeliveryOut])
async def list_my_deliveries(
    status_filter: DeliveryStatus | None = Query(default=None, alias='status'),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
) -> Page[RiderDeliveryOut]:
    items, total = await service.list_deliveries(
        session,
        principal,
        status=status_filter,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return Page[RiderDeliveryOut](
        items=items,
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.post('/rider/deliveries/{delivery_id}/pick', response_model=RiderDeliveryOut)
@limiter.limit('60/minute')
async def pick_delivery(
    request: Request,
    delivery_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
    settings: Settings = Depends(get_settings),
) -> RiderDeliveryOut:
    return await service.pick_up(
        session, principal, delivery_id, service.fee_from_settings(settings)
    )


@router.post('/rider/deliveries/{delivery_id}/complete', response_model=RiderDeliveryOut)
@limiter.limit('60/minute')
async def complete_delivery(
    request: Request,
    delivery_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
    settings: Settings = Depends(get_settings),
) -> RiderDeliveryOut:
    return await service.complete(
        session, principal, delivery_id, service.fee_from_settings(settings)
    )


@router.post('/rider/deliveries/{delivery_id}/fail', response_model=RiderDeliveryOut)
@limiter.limit('60/minute')
async def fail_delivery(
    request: Request,
    delivery_id: UUID,
    data: FailDeliveryIn,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
    settings: Settings = Depends(get_settings),
) -> RiderDeliveryOut:
    return await service.fail(
        session, principal, delivery_id, service.fee_from_settings(settings), data.reason
    )


@router.get('/rider/earnings', response_model=RiderEarningsOut)
async def rider_earnings(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_rider),
) -> RiderEarningsOut:
    return await service.earnings(session, principal)
