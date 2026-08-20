"""Versioned API (v1). Routers from every domain are aggregated here."""

from __future__ import annotations

from fastapi import APIRouter

from app.admin.router import router as admin_router
from app.api.v1 import auth, health
from app.carts.router import router as carts_router
from app.favorites.router import router as favorites_router
from app.orders.router import router as orders_router
from app.shops.router import router as shops_router
from app.users.router import router as users_router

api_router = APIRouter(prefix='/v1')
api_router.include_router(health.router, tags=['health'])
api_router.include_router(auth.router, prefix='/auth', tags=['auth'])
api_router.include_router(users_router, tags=['profile'])
api_router.include_router(shops_router, tags=['shops'])
api_router.include_router(carts_router, tags=['cart'])
api_router.include_router(orders_router, tags=['orders'])
api_router.include_router(favorites_router, tags=['favorites'])
api_router.include_router(admin_router, tags=['admin'])

__all__ = ['api_router']
