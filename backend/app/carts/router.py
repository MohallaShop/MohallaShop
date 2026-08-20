"""Carts domain HTTP routes (customer-only)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.roles import Role
from app.carts import service
from app.carts.schemas import AddCartItem, CartOut, UpdateCartItem
from app.core.deps import Principal, get_db, require_roles

router = APIRouter(prefix='/cart', tags=['cart'])

_customer = require_roles(Role.CUSTOMER)


@router.get('', response_model=CartOut)
async def get_cart(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> CartOut:
    return await service.get_cart(session, principal)


@router.post('/items', response_model=CartOut, status_code=status.HTTP_201_CREATED)
async def add_cart_item(
    data: AddCartItem,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> CartOut:
    return await service.add_item(session, principal, data.product_id, data.quantity)


@router.patch('/items/{item_id}', response_model=CartOut)
async def update_cart_item(
    item_id: UUID,
    data: UpdateCartItem,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> CartOut:
    return await service.update_item(session, principal, item_id, data.quantity)


@router.delete('/items/{item_id}', response_model=CartOut)
async def delete_cart_item(
    item_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> CartOut:
    return await service.delete_item(session, principal, item_id)


@router.delete('', response_model=CartOut)
async def clear_cart(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> CartOut:
    return await service.clear_cart(session, principal)
