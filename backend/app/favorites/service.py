"""Favorites service: list/add/remove saved shops for the signed-in customer."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import Principal
from app.favorites.models import FavoriteShop
from app.favorites.schemas import FavoriteShopOut
from app.shops.models import Shop, ShopStatus
from app.users.service import ensure_user


async def list_favorites(session: AsyncSession, principal: Principal) -> list[FavoriteShopOut]:
    user = await ensure_user(session, principal)
    rows = (
        await session.execute(
            select(FavoriteShop, Shop)
            .join(Shop, Shop.id == FavoriteShop.shop_id)
            .where(FavoriteShop.user_id == user.id)
            .order_by(Shop.name)
        )
    ).all()
    return [
        FavoriteShopOut(
            id=fav.id,
            shop_id=shop.id,
            shop_name=shop.name,
            shop_city=shop.address_city,
            shop_status=shop.status.value,
        )
        for fav, shop in rows
    ]


async def add_favorite(
    session: AsyncSession, principal: Principal, shop_id: UUID
) -> FavoriteShopOut:
    user = await ensure_user(session, principal)
    shop = await session.get(Shop, shop_id)
    if shop is None or shop.status != ShopStatus.ACTIVE:
        raise NotFoundError('Shop not found')
    existing = (
        await session.execute(
            select(FavoriteShop).where(
                FavoriteShop.user_id == user.id, FavoriteShop.shop_id == shop_id
            )
        )
    ).scalar_one_or_none()
    if existing is None:
        session.add(FavoriteShop(user_id=user.id, shop_id=shop_id))
        await session.commit()
        await session.flush()
        fav = (
            await session.execute(
                select(FavoriteShop).where(
                    FavoriteShop.user_id == user.id,
                    FavoriteShop.shop_id == shop_id,
                )
            )
        ).scalar_one()
    else:
        fav = existing
        await session.commit()
    return FavoriteShopOut(
        id=fav.id,
        shop_id=shop.id,
        shop_name=shop.name,
        shop_city=shop.address_city,
        shop_status=shop.status.value,
    )


async def remove_favorite(session: AsyncSession, principal: Principal, favorite_id: UUID) -> None:
    user = await ensure_user(session, principal)
    fav = await session.get(FavoriteShop, favorite_id)
    if fav is None or fav.user_id != user.id:
        raise NotFoundError('Favorite not found')
    await session.delete(fav)
    await session.commit()


__all__ = ['add_favorite', 'list_favorites', 'remove_favorite']
