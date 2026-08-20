"""Users domain service (also the data-access boundary for this domain).

The service owns all persistence and business rules; routers stay thin. The
``principal`` is always the server-verified Supabase subject (ADR-0002).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import Principal
from app.users.models import Address, User, UserProfile
from app.users.schemas import AddressCreate, AddressUpdate, ProfileUpdate


async def ensure_user(session: AsyncSession, principal: Principal) -> User:
    """Upsert the application user row for a principal (lazy bootstrap)."""
    stmt = (
        insert(User)
        .values(id=principal.user_id, phone=principal.phone, email=principal.email)
        .on_conflict_do_update(
            index_elements=['id'], set_={'phone': principal.phone, 'email': principal.email}
        )
        .returning(User)
    )
    result = await session.execute(stmt)
    user = result.scalar_one()
    await session.flush()
    return user


async def ensure_profile_row(session: AsyncSession, user_id: UUID) -> UserProfile:
    stmt = (
        insert(UserProfile)
        .values(user_id=user_id)
        .on_conflict_do_nothing(index_elements=['user_id'])
    )
    await session.execute(stmt)
    profile = await session.get(UserProfile, user_id)
    if profile is None:  # pragma: no cover - defensive
        raise NotFoundError('Profile not found')
    return profile


async def get_profile(session: AsyncSession, principal: Principal) -> tuple[User, UserProfile]:
    user = await ensure_user(session, principal)
    profile = await ensure_profile_row(session, user.id)
    await session.commit()
    return user, profile


async def update_profile(
    session: AsyncSession, principal: Principal, data: ProfileUpdate
) -> tuple[User, UserProfile]:
    user = await ensure_user(session, principal)
    profile = await ensure_profile_row(session, user.id)
    values = data.model_dump(exclude_unset=True)
    if values:
        await session.execute(
            update(UserProfile).where(UserProfile.user_id == user.id).values(**values)
        )
        await session.refresh(profile)
    await session.commit()
    return user, profile


async def list_addresses(session: AsyncSession, principal: Principal) -> list[Address]:
    user = await ensure_user(session, principal)
    result = await session.execute(
        select(Address)
        .where(Address.user_id == user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return list(result.scalars().all())


async def _get_owned_address(
    session: AsyncSession, principal: Principal, address_id: UUID
) -> Address:
    user = await ensure_user(session, principal)
    addr = await session.get(Address, address_id)
    if addr is None or addr.user_id != user.id:
        raise NotFoundError('Address not found')
    return addr


async def create_address(
    session: AsyncSession, principal: Principal, data: AddressCreate
) -> Address:
    user = await ensure_user(session, principal)
    if data.is_default:
        await session.execute(
            update(Address).where(Address.user_id == user.id).values(is_default=False)
        )
    addr = Address(user_id=user.id, **data.model_dump())
    session.add(addr)
    await session.commit()
    await session.refresh(addr)
    return addr


async def update_address(
    session: AsyncSession, principal: Principal, address_id: UUID, data: AddressUpdate
) -> Address:
    user = await ensure_user(session, principal)
    addr = await _get_owned_address(session, principal, address_id)
    values = data.model_dump(exclude_unset=True)
    if values.get('is_default'):
        await session.execute(
            update(Address).where(Address.user_id == user.id).values(is_default=False)
        )
    if values:
        for key, value in values.items():
            setattr(addr, key, value)
    await session.commit()
    await session.refresh(addr)
    return addr


async def delete_address(session: AsyncSession, principal: Principal, address_id: UUID) -> None:
    addr = await _get_owned_address(session, principal, address_id)
    await session.delete(addr)
    await session.commit()
