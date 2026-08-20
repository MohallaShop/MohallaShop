import { api } from './client'
import type {
  OrderDetail,
  OrderStatus,
  OrderSummary,
  Page,
  RejectOrder,
  ShopkeeperInventoryUpdate,
  ShopkeeperProductCreate,
  ShopkeeperProductOut,
  ShopkeeperProductUpdate,
  ShopkeeperShop,
} from './types'

/** Shopkeeper services. Scoped server-side to the authenticated shop owner. */

export async function getMyShop(token: string): Promise<ShopkeeperShop> {
  return api.get<ShopkeeperShop>('/shopkeeper/shop', { token })
}

export interface ListShopOrdersParams {
  page?: number
  page_size?: number
  status?: OrderStatus
}

export async function listShopOrders(
  token: string,
  params: ListShopOrdersParams = {},
): Promise<Page<OrderSummary>> {
  return api.get<Page<OrderSummary>>('/shopkeeper/orders', {
    token,
    query: { page: params.page, page_size: params.page_size, status: params.status },
  })
}

export async function getShopOrder(token: string, orderId: string): Promise<OrderDetail> {
  return api.get<OrderDetail>(`/shopkeeper/orders/${orderId}`, { token })
}

export async function acceptOrder(token: string, orderId: string): Promise<OrderDetail> {
  return api.post<OrderDetail>(`/shopkeeper/orders/${orderId}/accept`, { token })
}

export async function rejectOrder(
  token: string,
  orderId: string,
  input: RejectOrder = {},
): Promise<OrderDetail> {
  return api.post<OrderDetail>(`/shopkeeper/orders/${orderId}/reject`, { token, body: input })
}

export async function markPreparing(token: string, orderId: string): Promise<OrderDetail> {
  return api.post<OrderDetail>(`/shopkeeper/orders/${orderId}/preparing`, { token })
}

export async function markReady(token: string, orderId: string): Promise<OrderDetail> {
  return api.post<OrderDetail>(`/shopkeeper/orders/${orderId}/ready`, { token })
}

// ── Catalog management ────────────────────────────────────────
export interface ListShopProductsParams {
  q?: string
  page?: number
  page_size?: number
}

export async function listShopProducts(
  token: string,
  params: ListShopProductsParams = {},
): Promise<Page<ShopkeeperProductOut>> {
  return api.get<Page<ShopkeeperProductOut>>('/shopkeeper/products', {
    token,
    query: { q: params.q, page: params.page, page_size: params.page_size },
  })
}

export async function createShopProduct(
  token: string,
  input: ShopkeeperProductCreate,
): Promise<ShopkeeperProductOut> {
  return api.post<ShopkeeperProductOut>('/shopkeeper/products', { token, body: input })
}

export async function updateShopProduct(
  token: string,
  productId: string,
  input: ShopkeeperProductUpdate,
): Promise<ShopkeeperProductOut> {
  return api.patch<ShopkeeperProductOut>(`/shopkeeper/products/${productId}`, {
    token,
    body: input,
  })
}

export async function updateShopInventory(
  token: string,
  productId: string,
  input: ShopkeeperInventoryUpdate,
): Promise<ShopkeeperProductOut> {
  return api.patch<ShopkeeperProductOut>(`/shopkeeper/products/${productId}/inventory`, {
    token,
    body: input,
  })
}

export async function deleteShopProduct(token: string, productId: string): Promise<void> {
  await api.delete<void>(`/shopkeeper/products/${productId}`, { token })
}
