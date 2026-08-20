"""Auth surface. ``GET /auth/me`` returns the verified principal."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.schemas import PrincipalOut
from app.core.deps import get_current_principal
from app.core.security import Principal

router = APIRouter()


@router.get('/me', response_model=PrincipalOut)
async def me(principal: Principal = Depends(get_current_principal)) -> PrincipalOut:
    """Return the identity and roles of the current access token."""
    return PrincipalOut(
        user_id=principal.user_id,
        phone=principal.phone,
        email=principal.email,
        roles=principal.roles,
    )
