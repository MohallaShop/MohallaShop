"""Users domain service (also the data-access boundary for this domain).

The service owns all persistence and business rules; routers stay thin. The
``principal`` is always the server-verified Supabase subject (ADR-0002).
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import Principal
from app.users.models import Address, User, UserProfile
from app.users.schemas import AddressCreate, AddressUpdate, ProfileUpdate


async def ensure_user(session: AsyncSession, principal: Principal) -> User:
    """Resolve (lazily bootstrap) the application user row for a principal.

    The principal is the server-verified Supabase subject. The app treats
    ``users.id == principal.user_id`` as the canonical mapping, but two real
    edge cases must not 500:

    * **Recreated auth identity.** A user deletes/re-creates their Supabase
      account (new ``sub`` ⇒ new ``id``) but keeps the same email/phone. The
      insert would collide on the unique ``email``/``phone`` constraint. We
      instead reuse the existing row that already owns that contact.
    * **Merged identities.** A phone-OTP account and an email account (or any
      two Supabase identities) can resolve to the same real person. The first
      one to touch the DB owns the contact; the other reuses it.

    In every case we keep email/phone in sync with the verified token.
    """
    user = await session.get(User, principal.user_id)
    if user is not None:
        return await _sync_contact(session, user, principal)

    # No row for this subject. If another row already owns the same email or
    # phone, that is the same person — reuse it rather than violating the
    # unique constraint.
    match = await _find_by_contact(session, principal)
    if match is not None:
        return await _sync_contact(session, match, principal)

    # Create the row for this subject.
    user = User(id=principal.user_id, phone=principal.phone, email=principal.email)
    session.add(user)
    try:
        async with session.begin_nested():
            await session.flush()
    except IntegrityError:
        # Race: another request created a conflicting row between our lookup
        # and our insert. The savepoint is rolled back automatically; resolve
        # to the existing row (or re-raise if there is genuinely no match).
        existing = await _find_by_contact(session, principal)
        if existing is not None:
            return await _sync_contact(session, existing, principal)
        raise
    return user


def _contact_conditions(principal: Principal):
    conditions = []
    if principal.email:
        conditions.append(User.email == principal.email)
    if principal.phone:
        conditions.append(User.phone == principal.phone)
    return conditions


async def _find_by_contact(session: AsyncSession, principal: Principal) -> User | None:
    conditions = _contact_conditions(principal)
    if not conditions:
        return None
    result = await session.execute(select(User).where(or_(*conditions)))
    return result.scalars().first()


async def _sync_contact(session: AsyncSession, user: User, principal: Principal) -> User:
    """Keep email/phone in sync with the verified token.

    A field is only overwritten when the new value is not already owned by a
    *different* user row — otherwise we would re-introduce the very unique
    constraint violation we are trying to avoid.
    """
    if principal.email and user.email != principal.email:
        if not await _contact_owned_by_other(session, user.id, 'email', principal.email):
            user.email = principal.email
    if principal.phone and user.phone != principal.phone:
        if not await _contact_owned_by_other(session, user.id, 'phone', principal.phone):
            user.phone = principal.phone
    return user


async def _contact_owned_by_other(
    session: AsyncSession, user_id: UUID, field: str, value: str
) -> bool:
    """True if some *other* user row already owns ``value`` for ``field``."""
    column = User.email if field == 'email' else User.phone
    result = await session.execute(
        select(User.id).where(column == value, User.id != user_id).limit(1)
    )
    return result.scalar_one_or_none() is not None


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
