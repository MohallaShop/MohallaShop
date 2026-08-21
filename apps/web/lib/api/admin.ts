import { api } from './client'
import type {
  AdminAnalytics,
  AdminDashboard,
  AdminOrderOut,
  AdminProductOut,
  AdminRiderOut,
  AdminSettings,
  AdminShopOut,
  AdminUserDetail,
  AdminUserOut,
  Page,
  PlatformRole,
} from './types'

/** Admin read-only oversight services. RBAC enforced server-side. */

export async function getAdminDashboard(token: string): Promise<AdminDashboard> {
  return api.get<AdminDashboard>('/admin/dashboard', { token })
}

export async function listAdminUsers(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Page<AdminUserOut>> {
  return api.get<Page<AdminUserOut>>('/admin/users', {
    token,
    query: { page: params.page, page_size: params.page_size },
  })
}

export async function listAdminShops(
  token: string,
  params: { q?: string; page?: number; page_size?: number } = {},
): Promise<Page<AdminShopOut>> {
  return api.get<Page<AdminShopOut>>('/admin/shops', {
    token,
    query: { q: params.q, page: params.page, page_size: params.page_size },
  })
}

export async function listAdminProducts(
  token: string,
  params: { q?: string; page?: number; page_size?: number } = {},
): Promise<Page<AdminProductOut>> {
  return api.get<Page<AdminProductOut>>('/admin/products', {
    token,
    query: { q: params.q, page: params.page, page_size: params.page_size },
  })
}

export async function listAdminOrders(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Page<AdminOrderOut>> {
  return api.get<Page<AdminOrderOut>>('/admin/orders', {
    token,
    query: { page: params.page, page_size: params.page_size },
  })
}

export async function listAdminRiders(
  token: string,
  params: { page?: number; page_size?: number } = {},
): Promise<Page<AdminRiderOut>> {
  return api.get<Page<AdminRiderOut>>('/admin/riders', {
    token,
    query: { page: params.page, page_size: params.page_size },
  })
}

/** Legal admin targets for a shop's status (`pending` is set only by registration). */
export type AdminShopStatusTarget = 'active' | 'inactive' | 'suspended'

/** Approve / suspend / close a shop. Server enforces the transition map. */
export async function setAdminShopStatus(
  token: string,
  shopId: string,
  status: AdminShopStatusTarget,
): Promise<AdminShopOut> {
  return api.patch<AdminShopOut>(`/admin/shops/${shopId}/status`, { token, body: { status } })
}

// ── User management (Supabase Auth Admin API) ─────────────────
export async function getAdminUser(token: string, userId: string): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(`/admin/users/${userId}`, { token })
}

/** Replace a user's roles. The user is force-signed-out and must sign in again. */
export async function updateAdminUserRoles(
  token: string,
  userId: string,
  roles: PlatformRole[],
): Promise<AdminUserDetail> {
  return api.put<AdminUserDetail>(`/admin/users/${userId}/roles`, { token, body: { roles } })
}

// ── Analytics + settings ──────────────────────────────────────
export async function getAdminAnalytics(token: string): Promise<AdminAnalytics> {
  return api.get<AdminAnalytics>('/admin/analytics', { token })
}

export async function getAdminSettings(token: string): Promise<AdminSettings> {
  return api.get<AdminSettings>('/admin/settings', { token })
}
