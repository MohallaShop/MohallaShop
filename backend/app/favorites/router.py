"""Favorites HTTP routes (customer-only)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.roles import Role
from app.core.deps import Principal, get_db, require_roles
from app.favorites import service
from app.favorites.schemas import FavoriteShopOut

router = APIRouter(prefix='/favorites', tags=['favorites'])

_customer = require_roles(Role.CUSTOMER)


@router.get('/shops', response_model=list[FavoriteShopOut])
async def list_my_favorites(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> list[FavoriteShopOut]:
    return await service.list_favorites(session, principal)


@router.post(
    '/shops/{shop_id}',
    response_model=FavoriteShopOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_favorite_shop(
    shop_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> FavoriteShopOut:
    return await service.add_favorite(session, principal, shop_id)


@router.delete('/{favorite_id}', status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    favorite_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_customer),
) -> None:
    await service.remove_favorite(session, principal, favorite_id)
