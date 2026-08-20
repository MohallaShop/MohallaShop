import { api } from './client'
import type {
  AddressCreate,
  AddressList,
  AddressOut,
  AddressUpdate,
  ProfileOut,
  ProfileUpdate,
} from './types'

/** Users domain services: current-user profile + saved addresses. */

export async function getProfile(token: string): Promise<ProfileOut> {
  return api.get<ProfileOut>('/me/profile', { token })
}

export async function updateProfile(token: string, patch: ProfileUpdate): Promise<ProfileOut> {
  return api.patch<ProfileOut>('/me/profile', { token, body: patch })
}

export async function listAddresses(token: string): Promise<AddressList> {
  return api.get<AddressList>('/me/addresses', { token })
}

export async function createAddress(token: string, input: AddressCreate): Promise<AddressOut> {
  return api.post<AddressOut>('/me/addresses', { token, body: input })
}

export async function updateAddress(
  token: string,
  id: string,
  patch: AddressUpdate,
): Promise<AddressOut> {
  return api.patch<AddressOut>(`/me/addresses/${id}`, { token, body: patch })
}

export async function deleteAddress(token: string, id: string): Promise<void> {
  await api.delete<void>(`/me/addresses/${id}`, { token })
}
