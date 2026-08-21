"""Tests for Supabase JWT verification, principal extraction, and /auth/me."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.exceptions import PyJWKClientError

from app.auth.roles import Role
from app.core import security
from app.core.exceptions import AuthenticationError
from app.core.security import decode_principal


def _make_token(
    secret: str,
    *,
    sub: str | None = None,
    roles: list[str] | None = None,
    exp_delta: timedelta = timedelta(minutes=10),
    phone: str = '+919999999999',
) -> str:
    now = datetime.now(UTC)
    payload: dict = {
        'sub': sub or str(uuid4()),
        'phone': phone,
        'email': f'{sub or "user"}@example.com',
        'exp': now + exp_delta,
        'iat': now,
        'iss': 'supabase',
        'app_metadata': {'roles': roles if roles is not None else [Role.CUSTOMER.value]},
    }
    return jwt.encode(payload, secret, algorithm='HS256')


def test_principal_from_claims_maps_roles(jwt_secret: str) -> None:
    token = _make_token(jwt_secret, roles=['customer', 'shopkeeper'])
    principal = decode_principal(token, _settings(jwt_secret))
    assert Role.CUSTOMER in principal.roles
    assert Role.SHOPKEEPER in principal.roles


def test_unknown_roles_are_ignored(jwt_secret: str) -> None:
    token = _make_token(jwt_secret, roles=['customer', 'space-marine'])
    principal = decode_principal(token, _settings(jwt_secret))
    assert principal.roles == [Role.CUSTOMER]


def test_no_roles_defaults_to_customer(jwt_secret: str) -> None:
    """A role-less identity (fresh email/phone signup) is treated as customer."""
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            'sub': str(uuid4()),
            'phone': '+919999999999',
            'exp': now + timedelta(minutes=10),
            'iat': now,
            'app_metadata': {'roles': []},
        },
        jwt_secret,
        algorithm='HS256',
    )
    principal = decode_principal(token, _settings(jwt_secret))
    assert principal.roles == [Role.CUSTOMER]


async def test_role_less_principal_reaches_customer_endpoints(client, jwt_secret: str) -> None:
    """A role-less token can use the customer marketplace, but not shopkeeper/admin areas."""
    token = _make_token(jwt_secret, roles=[])
    headers = {'Authorization': f'Bearer {token}'}

    me = await client.get('/api/v1/auth/me', headers=headers)
    assert me.status_code == 200, me.text
    assert me.json()['roles'] == ['customer']

    cart = await client.get('/api/v1/cart', headers=headers)
    assert cart.status_code == 200, cart.text

    shop = await client.get('/api/v1/shopkeeper/shop', headers=headers)
    assert shop.status_code == 403, shop.text


def test_expired_token_rejected(jwt_secret: str) -> None:
    token = _make_token(jwt_secret, exp_delta=timedelta(seconds=-10))
    with pytest.raises(AuthenticationError):
        decode_principal(token, _settings(jwt_secret))


def test_tampered_token_rejected(jwt_secret: str) -> None:
    token = _make_token(jwt_secret)
    # Tamper the FIRST character of the signature segment. All six of its
    # bits are significant — unlike the final character, whose low bits can
    # be padding and survive the flip unchanged.
    head, payload, signature = token.split('.')
    flipped = 'B' if signature[0] != 'B' else 'C'
    tampered = f'{head}.{payload}.{flipped}{signature[1:]}'
    assert tampered != token
    with pytest.raises(AuthenticationError):
        decode_principal(tampered, _settings(jwt_secret))


async def test_auth_me_without_token_is_unauthenticated(client) -> None:
    r = await client.get('/api/v1/auth/me')
    assert r.status_code == 401


async def test_auth_me_returns_principal(client, jwt_secret: str) -> None:
    user_id = str(uuid4())
    token = _make_token(jwt_secret, sub=user_id, roles=['customer'])
    r = await client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['user_id'] == user_id
    assert 'customer' in body['roles']


def _settings(jwt_secret: str):
    from tests.conftest import make_test_settings

    s = make_test_settings()
    s.supabase_jwt_secret = jwt_secret
    return s


# ── JWKS (asymmetric) verification — new Supabase projects ────


class _FakeSigningKey:
    def __init__(self, key: str) -> None:
        self.key = key


class _FakeJwksClient:
    """Serves a fixed signing key; errors optionally on lookup."""

    def __init__(self, key: str, *, fail: bool = False) -> None:
        self._key = key
        self._fail = fail

    def get_signing_key_from_jwt(self, _token: str) -> _FakeSigningKey:
        if self._fail:
            raise PyJWKClientError('Unknown kid')
        return _FakeSigningKey(self._key)


def _es256_settings(jwks_url: str = 'https://example.invalid/jwks.json'):
    from tests.conftest import make_test_settings

    s = make_test_settings()
    s.supabase_jwt_secret = ''
    s.supabase_jwt_algorithm = 'ES256'
    s.supabase_jwks_url = jwks_url
    return s


def test_jwks_es256_token_verified_and_decoded(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    from cryptography.hazmat.primitives import serialization

    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    token = jwt.encode(
        {
            'sub': str(uuid4()),
            'phone': '+919999999999',
            'exp': datetime.now(UTC) + timedelta(minutes=10),
        },
        private_pem,
        algorithm='ES256',
    )
    monkeypatch.setattr(
        security, '_get_jwks_client', lambda url: _FakeJwksClient(public_pem.decode())
    )

    principal = decode_principal(token, _es256_settings())
    assert principal.roles == [Role.CUSTOMER]


def test_jwks_verifies_roles_from_app_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    from cryptography.hazmat.primitives import serialization

    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    token = jwt.encode(
        {
            'sub': str(uuid4()),
            'phone': '+919999999999',
            'exp': datetime.now(UTC) + timedelta(minutes=10),
            'app_metadata': {'roles': ['customer']},
        },
        private_pem,
        algorithm='ES256',
    )
    monkeypatch.setattr(
        security, '_get_jwks_client', lambda url: _FakeJwksClient(public_pem.decode())
    )

    principal = decode_principal(token, _es256_settings())
    assert Role.CUSTOMER in principal.roles


def test_jwks_failed_key_lookup_is_authentication_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(security, '_get_jwks_client', lambda url: _FakeJwksClient('', fail=True))
    bogus = jwt.encode(
        {'sub': str(uuid4()), 'exp': datetime.now(UTC) + timedelta(minutes=10)},
        'x' * 64,  # long enough to avoid PyJWT's InsecureKeyLengthWarning
        algorithm='HS256',
    )
    with pytest.raises(AuthenticationError):
        decode_principal(bogus, _es256_settings())
