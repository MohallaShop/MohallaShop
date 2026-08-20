/**
 * Shared API request/response types — mirror the FastAPI v1 contract exactly.
 *
 * Source of truth: backend `app/<domain>/schemas.py` + `app/api/common.py`.
 * Money is always a 2-decimal INR string (e.g. "199.00"); timestamps are
 * ISO-8601 UTC strings. These types stay transport-shaped — no client-side
 * reinterpretation of authoritative values (price, totals, inventory, status).
 */

/** Paginated envelope returned by all list endpoints. */
export interface Page<T> {
  items: T[]
  pagination: Pagination
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type OrderStatus =
  | 'placed'
  | 'pending_shop'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'rejected'
  | 'cancelled'

// ── Auth / profile / addresses ────────────────────────────────
export type Role = 'customer' | 'shopkeeper' | 'rider' | 'admin' | 'super_admin'

export interface PrincipalOut {
  user_id: string
  phone: string | null
  email: string | null
  roles: Role[]
}

export interface ProfileOut {
  user_id: string
  phone: string | null
  email: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface ProfileUpdate {
  display_name?: string
  avatar_url?: string
}

export interface AddressOut {
  id: string
  label: string | null
  line1: string
  line2: string | null
  landmark: string | null
  city: string
  state: string
  pincode: string
  contact_name: string | null
  contact_phone: string | null
  is_default: boolean
}

export interface AddressCreate {
  label?: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  contact_name?: string
  contact_phone?: string
  is_default?: boolean
}

export type AddressUpdate = Partial<AddressCreate>

export interface AddressList {
  items: AddressOut[]
}

// ── Shops / products ──────────────────────────────────────────
export interface ShopSummary {
  id: string
  name: string
  description: string | null
  phone: string | null
  city: string | null
  status: string
}

export interface ShopAddress {
  line1: string | null
  city: string | null
  state: string | null
  pincode: string | null
  latitude: string | null
  longitude: string | null
}

export interface ShopDetail {
  id: string
  name: string
  description: string | null
  phone: string | null
  address: ShopAddress
  status: string
}

export interface ProductOut {
  id: string
  shop_id: string
  name: string
  description: string | null
  price: string
  unit: string
  image_url: string | null
  in_stock: boolean
  category_id: string | null
}

export interface CategoryOut {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface CategorySummary {
  id: string
  name: string
  slug: string
  product_count: number
}

export interface ProductSummary {
  id: string
  shop_id: string
  shop_name: string
  name: string
  price: string
  unit: string
  image_url: string | null
  in_stock: boolean
}

export interface ShopkeeperShop {
  id: string
  name: string
  description: string | null
  phone: string | null
  status: string
  product_count: number
  pending_order_count: number
}

// ── Cart ──────────────────────────────────────────────────────
export interface CartItemOut {
  id: string
  product_id: string
  product_name: string
  unit: string
  unit_price: string
  image_url: string | null
  quantity: number
  line_total: string
}

export interface CartOut {
  id: string
  shop_id: string | null
  items: CartItemOut[]
}

export interface AddCartItem {
  product_id: string
  quantity: number
}

export interface UpdateCartItem {
  quantity: number
}

// ── Orders ────────────────────────────────────────────────────
export interface OrderItemOut {
  product_id: string | null
  product_name: string
  product_unit: string
  unit_price: string
  quantity: number
  line_total: string
}

export interface OrderHistoryOut {
  from_state: OrderStatus | null
  to_state: OrderStatus
  actor_role: string | null
  reason: string | null
  created_at: string
}

export interface DeliveryAddressOut {
  line1: string
  line2: string | null
  landmark: string | null
  city: string
  state: string
  pincode: string
  contact_name: string | null
  contact_phone: string | null
}

export interface OrderCustomerOut {
  user_id: string
  display_name: string | null
}

export interface OrderSummary {
  id: string
  order_no: string
  status: OrderStatus
  total_amount: string
  item_count: number
  placed_at: string
}

export interface OrderDetail extends OrderSummary {
  shop_id: string
  shop_name: string
  customer: OrderCustomerOut | null
  subtotal: string
  delivery_fee: string
  notes: string | null
  delivery_address: DeliveryAddressOut
  items: OrderItemOut[]
  history: OrderHistoryOut[]
}

export interface CreateOrder {
  address_id: string
  notes?: string
}

export interface RejectOrder {
  reason?: string
}

// ── Shopkeeper catalog management ─────────────────────────────
export interface ShopkeeperProductOut {
  id: string
  shop_id: string
  category_id: string | null
  name: string
  description: string | null
  price: string
  unit: string
  image_url: string | null
  is_active: boolean
  quantity_available: number
  low_stock_threshold: number | null
}

export interface ShopkeeperProductCreate {
  name: string
  description?: string
  price: string
  unit: string
  image_url?: string
  category_id?: string
  is_active?: boolean
  quantity_available?: number
  low_stock_threshold?: number
}

export interface ShopkeeperProductUpdate {
  name?: string
  description?: string
  price?: string
  unit?: string
  image_url?: string
  category_id?: string
  is_active?: boolean
  low_stock_threshold?: number
}

export interface ShopkeeperInventoryUpdate {
  quantity_available?: number
  low_stock_threshold?: number
}

// ── Admin oversight (read-only) ───────────────────────────────
export interface AdminDashboard {
  users: number
  shops_active: number
  shops_inactive: number
  products: number
  orders_by_status: Record<string, number>
}

export interface AdminUserOut {
  id: string
  phone: string | null
  email: string | null
  created_at: string
}

export interface AdminShopOut {
  id: string
  owner_user_id: string
  name: string
  status: string
  city: string | null
  product_count: number
  created_at: string
}

export interface AdminProductOut {
  id: string
  shop_id: string
  name: string
  price: string
  unit: string
  is_active: boolean
  quantity_available: number
}

export interface AdminOrderOut {
  id: string
  order_no: string
  status: string
  total_amount: string
  customer_user_id: string
  shop_id: string
  placed_at: string
}

// ── Favorites ─────────────────────────────────────────────────
export interface FavoriteShopOut {
  id: string
  shop_id: string
  shop_name: string
  shop_city: string | null
  shop_status: string
}
