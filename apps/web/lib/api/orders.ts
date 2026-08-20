import { api } from './client'
import type { CreateOrder, OrderDetail, OrderStatus, OrderSummary, Page } from './types'

/** Customer order services: checkout, history, detail, cancellation. */

export async function createOrder(token: string, input: CreateOrder): Promise<OrderDetail> {
  return api.post<OrderDetail>('/orders', { token, body: input })
}

export interface ListOrdersParams {
  page?: number
  page_size?: number
  status?: OrderStatus
}

export async function listOrders(
  token: string,
  params: ListOrdersParams = {},
): Promise<Page<OrderSummary>> {
  return api.get<Page<OrderSummary>>('/orders', {
    token,
    query: { page: params.page, page_size: params.page_size, status: params.status },
  })
}

export async function getOrder(token: string, orderId: string): Promise<OrderDetail> {
  return api.get<OrderDetail>(`/orders/${orderId}`, { token })
}

export async function cancelOrder(token: string, orderId: string): Promise<OrderDetail> {
  return api.post<OrderDetail>(`/orders/${orderId}/cancel`, { token })
}
