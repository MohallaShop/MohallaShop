"""Carts domain service.

A cart is single-shop: the first item binds ``cart.shop_id``; adding an item
from another shop is rejected. Checkout always reads the live server price; the
cart stores a display-only price snapshot.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.carts.models import Cart, CartItem, CartStatus
from app.carts.schemas import CartItemOut, CartOut
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import Principal
from app.shops.models import Product, Shop, ShopStatus
from app.users.service import ensure_user


class CartCrossShop(ConflictError):  # noqa: N818 - semantic; subclasses ConflictError
    code = 'cart_cross_shop'


async def get_or_create_active_cart(session: AsyncSession, principal: Principal) -> Cart:
    await ensure_user(session, principal)
    cart = (
        await session.execute(
            select(Cart).where(Cart.user_id == principal.user_id, Cart.status == CartStatus.ACTIVE)
        )
    ).scalar_one_or_none()
    if cart is None:
        cart = Cart(user_id=principal.user_id, status=CartStatus.ACTIVE)
        session.add(cart)
        await session.flush()
    return cart


async def _load_item_product_pairs(
    session: AsyncSession, cart_id: UUID
) -> list[tuple[CartItem, Product]]:
    result = await session.execute(
        select(CartItem, Product)
        .join(Product, Product.id == CartItem.product_id)
        .where(CartItem.cart_id == cart_id)
        .order_by(CartItem.created_at)
    )
    return [(item, product) for item, product in result.all()]


async def cart_payload(session: AsyncSession, cart: Cart) -> CartOut:
    pairs = await _load_item_product_pairs(session, cart.id)
    items = [
        CartItemOut(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name,
            unit=product.unit,
            unit_price=item.unit_price_snapshot,
            image_url=product.image_url,
            quantity=item.quantity,
            line_total=item.unit_price_snapshot * item.quantity,
        )
        for item, product in pairs
    ]
    return CartOut(id=cart.id, shop_id=cart.shop_id, items=items)


async def get_cart(session: AsyncSession, principal: Principal) -> CartOut:
    cart = await get_or_create_active_cart(session, principal)
    payload = await cart_payload(session, cart)
    await session.commit()
    return payload


async def add_item(
    session: AsyncSession, principal: Principal, product_id: UUID, quantity: int
) -> CartOut:
    product = (
        await session.execute(
            select(Product)
            .join(Shop, Shop.id == Product.shop_id)
            .where(
                Product.id == product_id,
                Product.is_active.is_(True),
                Shop.status == ShopStatus.ACTIVE,
            )
        )
    ).scalar_one_or_none()
    if product is None:
        raise NotFoundError('Product not found')

    cart = await get_or_create_active_cart(session, principal)
    if cart.shop_id is not None and cart.shop_id != product.shop_id:
        raise CartCrossShop('Cart already contains items from another shop')

    existing = (
        await session.execute(
            select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.quantity += quantity
    else:
        session.add(
            CartItem(
                cart_id=cart.id,
                product_id=product.id,
                quantity=quantity,
                unit_price_snapshot=product.price,
            )
        )
    cart.shop_id = product.shop_id
    await session.flush()
    payload = await cart_payload(session, cart)
    await session.commit()
    return payload


async def update_item(
    session: AsyncSession, principal: Principal, item_id: UUID, quantity: int
) -> CartOut:
    cart = await get_or_create_active_cart(session, principal)
    item = await session.get(CartItem, item_id)
    if item is None or item.cart_id != cart.id:
        raise NotFoundError('Cart item not found')
    item.quantity = quantity
    await session.flush()
    payload = await cart_payload(session, cart)
    await session.commit()
    return payload


async def delete_item(session: AsyncSession, principal: Principal, item_id: UUID) -> CartOut:
    cart = await get_or_create_active_cart(session, principal)
    item = await session.get(CartItem, item_id)
    if item is None or item.cart_id != cart.id:
        raise NotFoundError('Cart item not found')
    await session.delete(item)
    await session.flush()
    # If the cart is now empty, unbind the shop.
    remaining = (
        await session.execute(select(CartItem.id).where(CartItem.cart_id == cart.id).limit(1))
    ).first()
    if remaining is None:
        cart.shop_id = None
    payload = await cart_payload(session, cart)
    await session.commit()
    return payload


async def clear_cart(session: AsyncSession, principal: Principal) -> CartOut:
    cart = await get_or_create_active_cart(session, principal)
    await session.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    cart.shop_id = None
    payload = await cart_payload(session, cart)
    await session.commit()
    return payload


__all__ = [
    'add_item',
    'cart_payload',
    'clear_cart',
    'delete_item',
    'get_cart',
    'get_or_create_active_cart',
    'update_item',
]
