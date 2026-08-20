import { api } from './client'
import type { FavoriteShopOut } from './types'

/** Favorites services. Customer-only; RBAC enforced server-side. */

export async function listFavoriteShops(token: string): Promise<FavoriteShopOut[]> {
  return api.get<FavoriteShopOut[]>('/favorites/shops', { token })
}

export async function addFavoriteShop(token: string, shopId: string): Promise<FavoriteShopOut> {
  return api.post<FavoriteShopOut>(`/favorites/shops/${shopId}`, { token })
}

export async function removeFavoriteShop(token: string, favoriteId: string): Promise<void> {
  await api.delete<void>(`/favorites/${favoriteId}`, { token })
}
