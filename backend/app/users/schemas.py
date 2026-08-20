"""Pydantic schemas for the users domain."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    phone: str | None = None
    email: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=2048)


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    label: str | None = None
    line1: str
    line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str
    contact_name: str | None = None
    contact_phone: str | None = None
    is_default: bool


class AddressCreate(BaseModel):
    label: str | None = Field(default=None, max_length=60)
    line1: str = Field(min_length=1, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    landmark: str | None = Field(default=None, max_length=120)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    pincode: str = Field(min_length=3, max_length=10)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_phone: str | None = Field(default=None, max_length=20)
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=60)
    line1: str | None = Field(default=None, min_length=1, max_length=200)
    line2: str | None = Field(default=None, max_length=200)
    landmark: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    state: str | None = Field(default=None, min_length=1, max_length=120)
    pincode: str | None = Field(default=None, min_length=3, max_length=10)
    contact_name: str | None = Field(default=None, max_length=120)
    contact_phone: str | None = Field(default=None, max_length=20)
    is_default: bool | None = None


class AddressList(BaseModel):
    items: list[AddressOut]
