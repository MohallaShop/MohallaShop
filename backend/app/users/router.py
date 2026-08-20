"""Users domain HTTP routes (current-user profile + addresses)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import Principal, get_current_principal, get_db
from app.users import service
from app.users.schemas import (
    AddressCreate,
    AddressList,
    AddressOut,
    AddressUpdate,
    ProfileOut,
    ProfileUpdate,
)

router = APIRouter(prefix='/me', tags=['profile'])


@router.get('/profile', response_model=ProfileOut)
async def get_my_profile(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ProfileOut:
    user, profile = await service.get_profile(session, principal)
    return ProfileOut(
        user_id=user.id,
        phone=user.phone,
        email=user.email,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
    )


@router.patch('/profile', response_model=ProfileOut)
async def update_my_profile(
    data: ProfileUpdate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ProfileOut:
    user, profile = await service.update_profile(session, principal, data)
    return ProfileOut(
        user_id=user.id,
        phone=user.phone,
        email=user.email,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
    )


@router.get('/addresses', response_model=AddressList)
async def list_my_addresses(
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> AddressList:
    items = await service.list_addresses(session, principal)
    return AddressList(items=[AddressOut.model_validate(a) for a in items])


@router.post('/addresses', response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def create_my_address(
    data: AddressCreate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> AddressOut:
    addr = await service.create_address(session, principal, data)
    return AddressOut.model_validate(addr)


@router.patch('/addresses/{address_id}', response_model=AddressOut)
async def update_my_address(
    address_id: UUID,
    data: AddressUpdate,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> AddressOut:
    addr = await service.update_address(session, principal, address_id, data)
    return AddressOut.model_validate(addr)


@router.delete('/addresses/{address_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_address(
    address_id: UUID,
    session: AsyncSession = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> None:
    await service.delete_address(session, principal, address_id)
