import { api } from './client'
import type {
  CategoryOut,
  CategorySummary,
  Page,
  ProductOut,
  ProductSummary,
  ShopDetail,
  ShopSummary,
} from './types'

/**
 * Shops & products discovery services (customer-facing) + shopkeeper shop.
 * Discovery readers accept a null token — the catalogue is browsable by
 * guests (ADR-0006); the backend treats these routes as optional-auth.
 */

export interface ListShopsParams {
  page?: number
  page_size?: number
  q?: string
  city?: string
}

export async function listShops(
  token: string | null,
  params: ListShopsParams = {},
): Promise<Page<ShopSummary>> {
  return api.get<Page<ShopSummary>>('/shops', {
    token,
    query: {
      page: params.page,
      page_size: params.page_size,
      q: params.q,
      city: params.city,
    },
  })
}

export async function getShop(token: string | null, shopId: string): Promise<ShopDetail> {
  return api.get<ShopDetail>(`/shops/${shopId}`, { token })
}

export interface ListShopProductsParams {
  page?: number
  page_size?: number
  q?: string
  category_id?: string
  only_in_stock?: boolean
}

export async function listShopProducts(
  token: string | null,
  shopId: string,
  params: ListShopProductsParams = {},
): Promise<Page<ProductOut>> {
  return api.get<Page<ProductOut>>(`/shops/${shopId}/products`, {
    token,
    query: {
      page: params.page,
      page_size: params.page_size,
      q: params.q,
      category_id: params.category_id,
      only_in_stock: params.only_in_stock,
    },
  })
}

export async function getProduct(token: string | null, productId: string): Promise<ProductOut> {
  return api.get<ProductOut>(`/products/${productId}`, { token })
}

export async function listCategories(token: string | null): Promise<CategoryOut[]> {
  return api.get<CategoryOut[]>('/categories', { token })
}

export async function listCategorySummary(token: string | null): Promise<CategorySummary[]> {
  return api.get<CategorySummary[]>('/categories/summary', { token })
}

export interface SearchProductsParams {
  q?: string
  category_id?: string
  page?: number
  page_size?: number
}

export async function searchProducts(
  token: string | null,
  params: SearchProductsParams = {},
): Promise<Page<ProductSummary>> {
  return api.get<Page<ProductSummary>>('/products', {
    token,
    query: {
      q: params.q,
      category_id: params.category_id,
      page: params.page,
      page_size: params.page_size,
    },
  })
}
