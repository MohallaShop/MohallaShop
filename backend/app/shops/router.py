"""Shops domain HTTP routes: customer discovery + shopkeeper's shop."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.common import Page, PageParams, build_pagination
from app.auth.roles import Role
from app.core.deps import Principal, get_db, get_optional_principal, require_roles
from app.shops import service
from app.shops.models import Product
from app.shops.schemas import (
    CategoryOut,
    CategorySummary,
    ProductOut,
    ProductSummary,
    ShopCreate,
    ShopDetail,
    ShopkeeperInventoryUpdate,
    ShopkeeperProductCreate,
    ShopkeeperProductOut,
    ShopkeeperProductUpdate,
    ShopkeeperShop,
    ShopSummary,
)

router = APIRouter()

_shopkeeper = require_roles(Role.SHOPKEEPER)


def _product_out(product: Product) -> ProductOut:
    qty = product.inventory.quantity_available if product.inventory is not None else 0
    return ProductOut(
        id=product.id,
        shop_id=product.shop_id,
        name=product.name,
        description=product.description,
        price=product.price,
        unit=product.unit,
        image_url=product.image_url,
        in_stock=qty > 0,
        category_id=product.category_id,
    )


def _shopkeeper_product_out(product: Product) -> ShopkeeperProductOut:
    qty = product.inventory.quantity_available if product.inventory is not None else 0
    low = product.inventory.low_stock_threshold if product.inventory is not None else None
    return ShopkeeperProductOut(
        id=product.id,
        shop_id=product.shop_id,
        category_id=product.category_id,
        name=product.name,
        description=product.description,
        price=product.price,
        unit=product.unit,
        image_url=product.image_url,
        is_active=product.is_active,
        quantity_available=qty,
        low_stock_threshold=low,
    )


# ── Customer discovery ─────────────────────────────────────────
@router.get('/shops', response_model=Page[ShopSummary])
async def list_shops(
    q: str | None = Query(default=None),
    city: str | None = Query(default=None),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> Page[ShopSummary]:
    items, total = await service.list_shops(
        session, page=pagination.page, page_size=pagination.page_size, q=q, city=city
    )
    return Page[ShopSummary](
        items=[
            ShopSummary(
                id=s.id,
                name=s.name,
                description=s.description,
                phone=s.phone,
                city=s.address_city,
                status=s.status.value,
            )
            for s in items
        ],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/shops/{shop_id}', response_model=ShopDetail)
async def get_shop(
    shop_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> ShopDetail:
    return await service.get_shop(session, shop_id)


@router.get('/shops/{shop_id}/products', response_model=Page[ProductOut])
async def list_shop_products(
    shop_id: UUID,
    q: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    only_in_stock: bool = Query(default=False),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> Page[ProductOut]:
    items, total = await service.list_products(
        session,
        shop_id,
        page=pagination.page,
        page_size=pagination.page_size,
        q=q,
        category_id=category_id,
        only_in_stock=only_in_stock,
    )
    return Page[ProductOut](
        items=[_product_out(p) for p in items],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.get('/products/{product_id}', response_model=ProductOut)
async def get_product(
    product_id: UUID,
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> ProductOut:
    product = await service.get_product(session, product_id)
    return _product_out(product)


# ── Categories ─────────────────────────────────────────────────
@router.get('/categories', response_model=list[CategoryOut])
async def list_categories(
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> list[CategoryOut]:
    items = await service.list_categories(session)
    return [CategoryOut.model_validate(c) for c in items]


@router.get('/categories/summary', response_model=list[CategorySummary])
async def category_summary(
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> list[CategorySummary]:
    categories = await service.list_categories(session)
    counts = await service.category_product_counts(session)
    return [
        CategorySummary(id=c.id, name=c.name, slug=c.slug, product_count=counts.get(c.id, 0))
        for c in categories
    ]


# ── Global product search ──────────────────────────────────────
@router.get('/products', response_model=Page[ProductSummary])
async def search_products(
    q: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    _: Principal | None = Depends(get_optional_principal),
) -> Page[ProductSummary]:
    rows, total = await service.search_products(
        session,
        q=q,
        category_id=category_id,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return Page[ProductSummary](
        items=[
            ProductSummary(
                id=p.id,
                shop_id=p.shop_id,
                shop_name=shop_name,
                name=p.name,
                price=p.price,
                unit=p.unit,
                image_url=p.image_url,
                in_stock=qty > 0,
            )
            for p, shop_name, qty in rows
        ],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


# ── Shopkeeper ─────────────────────────────────────────────────
@router.post('/shopkeeper/shop', response_model=ShopkeeperShop, status_code=status.HTTP_201_CREATED)
async def register_my_shop(
    data: ShopCreate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> ShopkeeperShop:
    """Register the caller's shop. It is created in `pending` and hidden from
    customers until an admin approves it."""
    shop = await service.create_shop(session, principal, data)
    return ShopkeeperShop(
        id=shop.id,
        name=shop.name,
        description=shop.description,
        phone=shop.phone,
        status=shop.status.value,
        delivery_fee=shop.delivery_fee,
        product_count=0,
        pending_order_count=0,
    )


@router.get('/shopkeeper/shop', response_model=ShopkeeperShop)
async def get_my_shop(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> ShopkeeperShop:
    shop = await service.get_shopkeeper_shop(session, principal)
    product_count, pending = await service.shopkeeper_shop_counts(session, shop.id)
    return ShopkeeperShop(
        id=shop.id,
        name=shop.name,
        description=shop.description,
        phone=shop.phone,
        status=shop.status.value,
        delivery_fee=shop.delivery_fee,
        product_count=product_count,
        pending_order_count=pending,
    )


@router.get('/shopkeeper/products', response_model=Page[ShopkeeperProductOut])
async def list_my_products(
    q: str | None = Query(default=None),
    pagination: PageParams = Depends(),
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> Page[ShopkeeperProductOut]:
    shop = await service.get_shopkeeper_shop(session, principal)
    items, total = await service.list_shop_products_managed(
        session, shop.id, q=q, page=pagination.page, page_size=pagination.page_size
    )
    return Page[ShopkeeperProductOut](
        items=[_shopkeeper_product_out(p) for p in items],
        pagination=build_pagination(pagination.page, pagination.page_size, total),
    )


@router.post(
    '/shopkeeper/products',
    response_model=ShopkeeperProductOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_product(
    data: ShopkeeperProductCreate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> ShopkeeperProductOut:
    shop = await service.get_shopkeeper_shop(session, principal)
    product = await service.create_shop_product(session, shop.id, data)
    return _shopkeeper_product_out(product)


@router.patch('/shopkeeper/products/{product_id}', response_model=ShopkeeperProductOut)
async def update_my_product(
    product_id: UUID,
    data: ShopkeeperProductUpdate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> ShopkeeperProductOut:
    shop = await service.get_shopkeeper_shop(session, principal)
    product = await service.update_shop_product(session, shop.id, product_id, data)
    return _shopkeeper_product_out(product)


@router.patch('/shopkeeper/products/{product_id}/inventory', response_model=ShopkeeperProductOut)
async def update_my_inventory(
    product_id: UUID,
    data: ShopkeeperInventoryUpdate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> ShopkeeperProductOut:
    shop = await service.get_shopkeeper_shop(session, principal)
    product = await service.update_shop_inventory(session, shop.id, product_id, data)
    return _shopkeeper_product_out(product)


@router.delete('/shopkeeper/products/{product_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_product(
    product_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(_shopkeeper),
) -> None:
    shop = await service.get_shopkeeper_shop(session, principal)
    await service.delete_shop_product(session, shop.id, product_id)
