import { api } from './client'
import type {
  AdminDashboard,
  AdminOrderOut,
  AdminProductOut,
  AdminShopOut,
  AdminUserOut,
  Page,
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
