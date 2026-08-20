import { api } from './client'
import type { AddCartItem, CartOut, UpdateCartItem } from './types'

/** Cart services. Single-shop; backend is the single source of truth. */

export async function getCart(token: string): Promise<CartOut> {
  return api.get<CartOut>('/cart', { token })
}

export async function addCartItem(token: string, input: AddCartItem): Promise<CartOut> {
  return api.post<CartOut>('/cart/items', { token, body: input })
}

export async function updateCartItem(
  token: string,
  itemId: string,
  input: UpdateCartItem,
): Promise<CartOut> {
  return api.patch<CartOut>(`/cart/items/${itemId}`, { token, body: input })
}

export async function deleteCartItem(token: string, itemId: string): Promise<CartOut> {
  return api.delete<CartOut>(`/cart/items/${itemId}`, { token })
}

export async function clearCart(token: string): Promise<CartOut> {
  return api.delete<CartOut>('/cart', { token })
}
