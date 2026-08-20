"""Shared API helpers: pagination dependency, page envelope, money type."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, PlainSerializer

# Money is always serialized as a 2-decimal INR string in responses.
Money = Annotated[Decimal, PlainSerializer(lambda v: f'{Decimal(v):.2f}', return_type=str)]

T = TypeVar('T')


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class Page(BaseModel, Generic[T]):
    items: list[T]
    pagination: Pagination


class PageParams:
    """FastAPI dependency for offset/limit pagination."""

    def __init__(
        self,
        page: int = Query(1, ge=1, description='1-indexed page number'),
        page_size: int = Query(20, ge=1, le=50, description='Items per page (max 50)'),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def build_pagination(page: int, page_size: int, total: int) -> Pagination:
    total_pages = (total + page_size - 1) // page_size if page_size else 0
    return Pagination(page=page, page_size=page_size, total=total, total_pages=total_pages)
