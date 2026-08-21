import { api } from './client'
import type {
  FailDelivery,
  Page,
  RiderDashboard,
  RiderDelivery,
  RiderEarnings,
  RiderState,
} from './types'

/** Rider services: availability, delivery lifecycle, earnings. RBAC enforced server-side. */

export async function goOnline(token: string): Promise<RiderState> {
  return api.post<RiderState>('/rider/online', { token })
}

export async function goOffline(token: string): Promise<RiderState> {
  return api.post<RiderState>('/rider/offline', { token })
}

export async function getRiderDashboard(token: string): Promise<RiderDashboard> {
  return api.get<RiderDashboard>('/rider/dashboard', { token })
}

export async function listRiderDeliveries(
  token: string,
  params: { status?: string; page?: number; page_size?: number } = {},
): Promise<Page<RiderDelivery>> {
  return api.get<Page<RiderDelivery>>('/rider/deliveries', {
    token,
    query: { status: params.status, page: params.page, page_size: params.page_size },
  })
}

export async function pickDelivery(token: string, deliveryId: string): Promise<RiderDelivery> {
  return api.post<RiderDelivery>(`/rider/deliveries/${deliveryId}/pick`, { token })
}

export async function completeDelivery(token: string, deliveryId: string): Promise<RiderDelivery> {
  return api.post<RiderDelivery>(`/rider/deliveries/${deliveryId}/complete`, { token })
}

export async function failDelivery(
  token: string,
  deliveryId: string,
  data: FailDelivery = {},
): Promise<RiderDelivery> {
  return api.post<RiderDelivery>(`/rider/deliveries/${deliveryId}/fail`, { token, body: data })
}

export async function getRiderEarnings(token: string): Promise<RiderEarnings> {
  return api.get<RiderEarnings>('/rider/earnings', { token })
}
