/**
 * In-memory fake backend implementing the Phase 1a contract — used by the
 * E2E-style vertical-slice flow test. Mirrors backend/app behavior:
 * envelope errors, pagination, single-shop cart, server-side pricing,
 * inventory decrement, order state machine, shop isolation (404).
 */

import type { OrderStatus } from '@/lib/api/types'

export interface FAddress {
  id: string
  user_id: string
  line1: string
  city: string
  state: string
  pincode: string
  is_default: boolean
}

export interface FProduct {
  id: string
  shop_id: string
  name: string
  price: number
  unit: string
  in_stock: boolean
  qty: number
}

export interface FCartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
}

export interface FOrderItem {
  product_name: string
  unit_price: number
  quantity: number
}

export interface FHistory {
  from_state: OrderStatus | null
  to_state: OrderStatus
  actor_role: string
}

export interface FOrder {
  id: string
  order_no: string
  user_id: string
  shop_id: string
  status: OrderStatus
  placed_at: string
  subtotal: number
  total: number
  address: FAddress
  items: FOrderItem[]
  history: FHistory[]
}

export const CUSTOMER = { id: 'u-customer', roles: ['customer'] }
export const SHOPKEEPER = { id: 'u-shop', roles: ['shopkeeper'] }
export const OTHER_SHOPKEEPER = { id: 'u-other', roles: ['shopkeeper'] }
export const TOKENS: Record<string, { id: string; roles: string[] }> = {
  'customer-token': CUSTOMER,
  'shopkeeper-token': SHOPKEEPER,
  'other-shopkeeper-token': OTHER_SHOPKEEPER,
}

export interface FShop {
  id: string
  name: string
  owner: string
  active: boolean
}

const SHOP_A: FShop = { id: 'shop-a', name: 'Sharma Kirana', owner: 'u-shop', active: true }
const SHOP_B: FShop = { id: 'shop-b', name: 'Other Store', owner: 'u-other', active: true }

const P_A1: FProduct = {
  id: 'p-a1',
  shop_id: 'shop-a',
  name: 'Wheat Atta',
  price: 52,
  unit: '1 kg',
  in_stock: true,
  qty: 10,
}
const P_A2: FProduct = {
  id: 'p-a2',
  shop_id: 'shop-a',
  name: 'Milk',
  price: 25,
  unit: '500 ml',
  in_stock: true,
  qty: 20,
}
const P_B1: FProduct = {
  id: 'p-b1',
  shop_id: 'shop-b',
  name: 'Rice',
  price: 128,
  unit: '5 kg',
  in_stock: true,
  qty: 5,
}
const P_A3: FProduct = {
  id: 'p-a3',
  shop_id: 'shop-a',
  name: 'Bread',
  price: 45,
  unit: '400 g',
  in_stock: false,
  qty: 0,
}

let shops: FShop[]
let products: FProduct[]
let cartItems: FCartItem[]
let addresses: FAddress[]
let orders: FOrder[]

export function resetDb() {
  shops = [SHOP_A, SHOP_B]
  // Clone so stock mutations don't leak between tests.
  products = [P_A1, P_A2, P_A3, P_B1].map((p) => ({ ...p }))
  cartItems = []
  addresses = []
  orders = []
}

const money = (n: number) => n.toFixed(2)

const pageEnvelope = (items: unknown[], page = 1, pageSize = 20) => ({
  items,
  pagination: {
    page,
    page_size: pageSize,
    total: items.length,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  },
})

function orderSummary(o: FOrder) {
  const item_count = o.items.reduce((s, it) => s + it.quantity, 0)
  return {
    id: o.id,
    order_no: o.order_no,
    status: o.status,
    total_amount: money(o.total),
    item_count,
    placed_at: o.placed_at,
  }
}

function orderDetail(o: FOrder, customer: { id: string; roles: string[] }) {
  return {
    ...orderSummary(o),
    shop_id: o.shop_id,
    shop_name: shops.find((s) => s.id === o.shop_id)?.name ?? '',
    customer: customer.id !== CUSTOMER.id ? { user_id: CUSTOMER.id, display_name: 'Aarav' } : null,
    subtotal: money(o.subtotal),
    delivery_fee: '0.00',
    notes: null,
    delivery_address: {
      line1: o.address.line1,
      line2: null,
      landmark: null,
      city: o.address.city,
      state: o.address.state,
      pincode: o.address.pincode,
      contact_name: null,
      contact_phone: null,
    },
    items: o.items.map((it) => ({
      product_id: products.find((p) => p.name === it.product_name)?.id ?? null,
      product_name: it.product_name,
      product_unit: 'pc',
      unit_price: money(it.unit_price),
      quantity: it.quantity,
      line_total: money(it.unit_price * it.quantity),
    })),
    history: o.history.map((h) => ({ ...h, reason: null, created_at: o.placed_at })),
  }
}

function principalOf(token: string | null) {
  if (!token) return null
  return TOKENS[token] ?? null
}

function cartPayload(userId: string) {
  const items = cartItems
    .filter((c) => c.user_id === userId)
    .map((c) => {
      const p = products.find((x) => x.id === c.product_id)!
      return {
        id: c.id,
        product_id: c.product_id,
        product_name: p.name,
        unit: p.unit,
        unit_price: money(p.price),
        image_url: null,
        quantity: c.quantity,
        line_total: money(p.price * c.quantity),
      }
    })
  const first = items[0]
  const shopId = first ? products.find((p) => p.id === first.product_id)!.shop_id : null
  return { id: 'cart-' + userId, shop_id: shopId, items }
}

const err = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message, details: {} } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  placed: [],
  pending_shop: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup'],
  ready_for_pickup: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

/** Fetch handler bound to the fake backend (install via vi.stubGlobal). */
export async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input))
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const method = (init?.method ?? 'GET').toUpperCase()
  const headers = init?.headers as Record<string, string> | undefined
  const token = headers?.Authorization?.replace('Bearer ', '') ?? null
  const principal = principalOf(token)
  const body = init?.body ? JSON.parse(String(init.body)) : null

  if (!principal) return err(401, 'unauthenticated', 'Missing bearer token')

  // ── Profile / addresses ────────────────────────────────────
  if (method === 'GET' && path === '/me/profile')
    return json({
      user_id: principal.id,
      phone: '+91',
      email: null,
      display_name: 'Aarav',
      avatar_url: null,
    })
  if (method === 'GET' && path === '/me/addresses')
    return json({ items: addresses.filter((a) => a.user_id === principal.id) })
  if (method === 'POST' && path === '/me/addresses') {
    const a: FAddress = {
      id: 'addr-' + addresses.length,
      user_id: principal.id,
      line1: body.line1,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      is_default: body.is_default ?? false,
    }
    addresses.push(a)
    return json(a, 201)
  }

  // ── Discovery ──────────────────────────────────────────────
  if (method === 'GET' && path === '/shops') {
    const active = shops
      .filter((s) => s.active)
      .map((s) => ({
        id: s.id,
        name: s.name,
        description: 'Local shop',
        phone: null,
        city: 'Pune',
        status: 'active',
      }))
    return json(pageEnvelope(active))
  }
  const shopMatch = path.match(/^\/shops\/([^/]+)$/)
  if (method === 'GET' && shopMatch) {
    const s = shops.find((x) => x.id === shopMatch[1] && x.active)
    if (!s) return err(404, 'not_found', 'Shop not found')
    return json({
      id: s.id,
      name: s.name,
      description: 'Local shop',
      phone: null,
      address: {
        line1: null,
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        latitude: null,
        longitude: null,
      },
      status: 'active',
    })
  }
  const prodMatch = path.match(/^\/shops\/([^/]+)\/products$/)
  if (method === 'GET' && prodMatch) {
    const active = products
      .filter((p) => p.shop_id === prodMatch[1] && p.in_stock)
      .map((p) => ({
        id: p.id,
        shop_id: p.shop_id,
        name: p.name,
        description: null,
        price: money(p.price),
        unit: p.unit,
        image_url: null,
        in_stock: p.in_stock,
        category_id: null,
      }))
    return json(pageEnvelope(active))
  }
  const singleProd = path.match(/^\/products\/([^/]+)$/)
  if (method === 'GET' && singleProd) {
    const p = products.find((x) => x.id === singleProd[1] && x.in_stock)
    if (!p) return err(404, 'not_found', 'Product not found')
    return json({
      id: p.id,
      shop_id: p.shop_id,
      name: p.name,
      description: null,
      price: money(p.price),
      unit: p.unit,
      image_url: null,
      in_stock: p.in_stock,
      category_id: null,
    })
  }

  // ── Cart (customer only) ───────────────────────────────────
  if (path === '/cart' || path.startsWith('/cart/')) {
    if (!principal.roles.includes('customer'))
      return err(403, 'forbidden', 'Insufficient permissions')
  }
  if (method === 'GET' && path === '/cart') return json(cartPayload(principal.id))
  if (method === 'DELETE' && path === '/cart') {
    cartItems = cartItems.filter((c) => c.user_id !== principal.id)
    return json(cartPayload(principal.id))
  }
  if (method === 'POST' && path === '/cart/items') {
    const product = products.find((p) => p.id === body.product_id && p.in_stock)
    if (!product) return err(404, 'not_found', 'Product not found')
    const existing = cartItems.find((c) => c.user_id === principal.id)
    const cartShop = existing ? products.find((p) => p.id === existing.product_id)!.shop_id : null
    if (cartShop && cartShop !== product.shop_id)
      return err(409, 'cart_cross_shop', 'Cart already contains items from another shop')
    const line = cartItems.find(
      (c) => c.user_id === principal.id && c.product_id === body.product_id,
    )
    if (line) line.quantity += body.quantity
    else
      cartItems.push({
        id: 'ci-' + cartItems.length,
        user_id: principal.id,
        product_id: body.product_id,
        quantity: body.quantity,
      })
    return json(cartPayload(principal.id), 201)
  }
  const cartItemMatch = path.match(/^\/cart\/items\/([^/]+)$/)
  if (method === 'PATCH' && cartItemMatch) {
    const line = cartItems.find((c) => c.id === cartItemMatch[1] && c.user_id === principal.id)
    if (!line) return err(404, 'not_found', 'Cart item not found')
    line.quantity = body.quantity
    return json(cartPayload(principal.id))
  }
  if (method === 'DELETE' && cartItemMatch) {
    cartItems = cartItems.filter((c) => !(c.id === cartItemMatch[1] && c.user_id === principal.id))
    return json(cartPayload(principal.id))
  }

  // ── Orders (customer) ──────────────────────────────────────
  if (method === 'POST' && path === '/orders') {
    if (!principal.roles.includes('customer'))
      return err(403, 'forbidden', 'Insufficient permissions')
    const lines = cartItems.filter((c) => c.user_id === principal.id)
    if (lines.length === 0) return err(409, 'empty_cart', 'Cannot checkout an empty cart')
    const addr = addresses.find((a) => a.id === body.address_id && a.user_id === principal.id)
    if (!addr) return err(404, 'not_found', 'Address not found')
    const shopId = products.find((p) => p.id === lines[0]!.product_id)!.shop_id
    const items = lines.map((l) => {
      const p = products.find((x) => x.id === l.product_id)!
      if (l.quantity > p.qty) return null
      return { p, l }
    })
    if (items.some((x) => x === null))
      return err(409, 'insufficient_inventory', 'Insufficient stock for an item')
    for (const it of items as { p: FProduct; l: FCartItem }[]) it.p.qty -= it.l.quantity
    const subtotal = (items as { p: FProduct; l: FCartItem }[]).reduce(
      (s, { p, l }) => s + p.price * l.quantity,
      0,
    )
    const order: FOrder = {
      id: 'order-' + (orders.length + 1),
      order_no: 'MS-' + (orders.length + 1).toString().padStart(4, '0'),
      user_id: principal.id,
      shop_id: shopId,
      status: 'pending_shop',
      placed_at: '2026-08-10T10:00:00Z',
      subtotal,
      total: subtotal,
      address: addr,
      items: (items as { p: FProduct; l: FCartItem }[]).map(({ p, l }) => ({
        product_name: p.name,
        unit_price: p.price,
        quantity: l.quantity,
      })),
      history: [{ from_state: null, to_state: 'pending_shop', actor_role: 'customer' }],
    }
    orders.push(order)
    cartItems = cartItems.filter((c) => c.user_id !== principal.id)
    return json(orderDetail(order, principal), 201)
  }
  if (method === 'GET' && path === '/orders') {
    const mine = orders.filter((o) => o.user_id === principal.id).map(orderSummary)
    return json(pageEnvelope(mine))
  }
  const myOrder = path.match(/^\/orders\/([^/]+)$/)
  if (method === 'GET' && myOrder) {
    const o = orders.find((x) => x.id === myOrder[1] && x.user_id === principal.id)
    if (!o) return err(404, 'not_found', 'Order not found')
    return json(orderDetail(o, principal))
  }
  const myOrderCancel = path.match(/^\/orders\/([^/]+)\/cancel$/)
  if (method === 'POST' && myOrderCancel) {
    const o = orders.find((x) => x.id === myOrderCancel[1] && x.user_id === principal.id)
    if (!o) return err(404, 'not_found', 'Order not found')
    if (!ALLOWED[o.status].includes('cancelled'))
      return err(409, 'illegal_state_transition', 'Cannot cancel now')
    const previous = o.status
    o.status = 'cancelled'
    o.history.push({ from_state: previous, to_state: 'cancelled', actor_role: 'customer' })
    return json(orderDetail(o, principal))
  }

  // ── Shopkeeper ─────────────────────────────────────────────
  if (path.startsWith('/shopkeeper/')) {
    if (!principal.roles.includes('shopkeeper'))
      return err(403, 'forbidden', 'Insufficient permissions')
    const shop = shops.find((s) => s.owner === principal.id)
    if (!shop) return err(404, 'no_shop', 'You do not own a shop yet')
    if (method === 'GET' && path === '/shopkeeper/shop')
      return json({
        id: shop.id,
        name: shop.name,
        description: null,
        phone: null,
        status: 'active',
        product_count: products.filter((p) => p.shop_id === shop.id).length,
        pending_order_count: orders.filter(
          (o) => o.shop_id === shop.id && o.status === 'pending_shop',
        ).length,
      })
    if (method === 'GET' && path === '/shopkeeper/orders') {
      const mine = orders.filter((o) => o.shop_id === shop.id).map(orderSummary)
      return json(pageEnvelope(mine))
    }
    const skOrder = path.match(
      /^\/shopkeeper\/orders\/([^/]+)(\/(accept|reject|preparing|ready))?$/,
    )
    if (skOrder) {
      const o = orders.find((x) => x.id === skOrder[1] && x.shop_id === shop.id)
      if (!o) return err(404, 'not_found', 'Order not found') // isolation: no existence leak
      const action = skOrder[3]
      if (action) {
        const target = {
          accept: 'accepted',
          reject: 'rejected',
          preparing: 'preparing',
          ready: 'ready_for_pickup',
        }[action] as OrderStatus
        if (!ALLOWED[o.status].includes(target))
          return err(409, 'illegal_state_transition', `Cannot transition from ${o.status}`)
        const previous = o.status
        o.status = target
        o.history.push({ from_state: previous, to_state: target, actor_role: 'shopkeeper' })
        return json(orderDetail(o, principal))
      }
      return json(orderDetail(o, principal))
    }
  }

  return err(404, 'not_found', `No route: ${method} ${path}`)
}
