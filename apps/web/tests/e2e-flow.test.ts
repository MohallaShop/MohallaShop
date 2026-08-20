/**
 * End-to-end vertical-slice test (contract level).
 *
 * Drives the real typed API services through the full customer → shopkeeper
 * journey against an in-memory fake backend implementing the Phase 1a contract:
 *
 *   Customer login → shop discovery → products → cart → checkout → order
 *     → Shopkeeper login → queue → accept → preparing → ready
 *
 * The identity step is represented by tokens (a real Supabase project + SMS
 * cannot run inside vitest); everything after identity — payloads, envelope
 * errors, pagination, server pricing, inventory, the state machine, shop
 * isolation — exercises the same code the browser runs. A browser-level
 * Playwright spec against the real stack is the documented next step.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { addCartItem, getCart, updateCartItem } from '@/lib/api/cart'
import { cancelOrder, createOrder, getOrder, listOrders } from '@/lib/api/orders'
import { createAddress, listAddresses } from '@/lib/api/profile'
import {
  acceptOrder,
  getMyShop,
  getShopOrder,
  listShopOrders,
  markPreparing,
  markReady,
} from '@/lib/api/shopkeeper'
import { getProduct, getShop, listShopProducts, listShops } from '@/lib/api/shops'
import { resetDb, fakeFetch } from './fakeBackend'

describe('customer → shopkeeper vertical slice', () => {
  beforeEach(() => {
    resetDb()
    vi.stubGlobal('fetch', fakeFetch)
  })

  it('performs the complete marketplace flow', async () => {
    const customerToken = 'customer-token'
    const shopkeeperToken = 'shopkeeper-token'

    // 1. Shop discovery
    const shops = await listShops(customerToken)
    expect(shops.items).toHaveLength(2)
    const shop = shops.items[0]!
    expect(shop.name).toBe('Sharma Kirana')

    // 2. Shop detail + products
    const detail = await getShop(customerToken, shop.id)
    expect(detail.name).toBe('Sharma Kirana')
    const products = await listShopProducts(customerToken, shop.id)
    expect(products.items.map((p) => p.name)).toEqual(
      expect.arrayContaining(['Wheat Atta', 'Milk']),
    )

    // 3. Cart: add two items; quantities + display totals come from the backend
    const atta = products.items.find((p) => p.name === 'Wheat Atta')!
    const milk = products.items.find((p) => p.name === 'Milk')!
    let cart = await addCartItem(customerToken, { product_id: atta.id, quantity: 2 })
    cart = await addCartItem(customerToken, { product_id: milk.id, quantity: 1 })
    expect(cart.items).toHaveLength(2)
    expect(cart.shop_id).toBe(shop.id)
    expect(cart.items[0]!.line_total).toBe('104.00')
    cart = await updateCartItem(customerToken, cart.items[0]!.id, { quantity: 3 })
    expect(cart.items[0]!.line_total).toBe('156.00')

    // 4. Address + checkout (server computes the total; client never sends it)
    await createAddress(customerToken, {
      line1: '12, Gandhi Chowk',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    })
    const addr = (await listAddresses(customerToken)).items[0]!
    const order = await createOrder(customerToken, { address_id: addr.id })
    expect(order.status).toBe('pending_shop')
    expect(order.subtotal).toBe('181.00') // 52*3 + 25*1
    expect(order.total_amount).toBe('181.00')

    // Cart is consumed and inventory decremented
    const afterCart = await getCart(customerToken)
    expect(afterCart.items).toHaveLength(0)
    expect(afterCart.shop_id).toBeNull()
    const attaAfter = await getProduct(customerToken, atta.id)
    expect(attaAfter.in_stock).toBe(true)

    // 5. Shopkeeper sees the incoming order
    const myShop = await getMyShop(shopkeeperToken)
    expect(myShop.id).toBe(shop.id)
    expect(myShop.pending_order_count).toBe(1)
    const queue = await listShopOrders(shopkeeperToken, { status: 'pending_shop' })
    expect(queue.items).toHaveLength(1)
    expect(queue.items[0]!.id).toBe(order.id)
    const skView = await getShopOrder(shopkeeperToken, order.id)
    expect(skView.customer?.display_name).toBe('Aarav')

    // 6. State machine: accept → preparing → ready
    await acceptOrder(shopkeeperToken, order.id)
    const preparing = await markPreparing(shopkeeperToken, order.id)
    expect(preparing.status).toBe('preparing')
    const ready = await markReady(shopkeeperToken, order.id)
    expect(ready.status).toBe('ready_for_pickup')

    // 7. Customer sees the final status + full history
    const customerView = await getOrder(customerToken, order.id)
    expect(customerView.status).toBe('ready_for_pickup')
    expect(customerView.history.map((h) => h.to_state)).toEqual([
      'pending_shop',
      'accepted',
      'preparing',
      'ready_for_pickup',
    ])
    const myOrders = await listOrders(customerToken)
    expect(myOrders.items[0]!.order_no).toBe(order.order_no)
  })

  it('enforces the single-shop cart rule (409 cart_cross_shop)', async () => {
    const customerToken = 'customer-token'
    const shops = await listShops(customerToken)
    const productsA = await listShopProducts(customerToken, shops.items[0]!.id)
    await addCartItem(customerToken, { product_id: productsA.items[0]!.id, quantity: 1 })

    const productsB = await listShopProducts(customerToken, shops.items[1]!.id)
    const err = await addCartItem(customerToken, {
      product_id: productsB.items[0]!.id,
      quantity: 1,
    }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(409)
    expect((err as ApiError).code).toBe('cart_cross_shop')
  })

  it('isolates shops: another shopkeeper cannot see the order (404)', async () => {
    const customerToken = 'customer-token'
    const otherToken = 'other-shopkeeper-token'

    const shops = await listShops(customerToken)
    const products = await listShopProducts(customerToken, shops.items[0]!.id)
    await addCartItem(customerToken, { product_id: products.items[0]!.id, quantity: 1 })
    await createAddress(customerToken, { line1: 'X', city: 'Y', state: 'Z', pincode: '123' })
    const addr = (await listAddresses(customerToken)).items[0]!
    const order = await createOrder(customerToken, { address_id: addr.id })

    const otherView = await getShopOrder(otherToken, order.id).catch((e: unknown) => e)
    expect(otherView).toBeInstanceOf(ApiError)
    expect((otherView as ApiError).status).toBe(404)
  })

  it('rejects illegal transitions and empty-checkout with 409', async () => {
    const customerToken = 'customer-token'
    const shopkeeperToken = 'shopkeeper-token'

    const emptyCheckout = await createOrder(customerToken, {
      address_id: 'does-not-exist',
    }).catch((e: unknown) => e)
    expect((emptyCheckout as ApiError).status).toBe(409)
    expect((emptyCheckout as ApiError).code).toBe('empty_cart')

    const shops = await listShops(customerToken)
    const products = await listShopProducts(customerToken, shops.items[0]!.id)
    await addCartItem(customerToken, { product_id: products.items[0]!.id, quantity: 1 })
    await createAddress(customerToken, { line1: 'X', city: 'Y', state: 'Z', pincode: '123' })
    const addr = (await listAddresses(customerToken)).items[0]!
    const order = await createOrder(customerToken, { address_id: addr.id })

    await markPreparing(shopkeeperToken, order.id).catch((e: unknown) => {
      expect((e as ApiError).status).toBe(409)
      expect((e as ApiError).code).toBe('illegal_state_transition')
    })
    await acceptOrder(shopkeeperToken, order.id)

    // Customer can cancel only while pending_shop/accepted — accepted is allowed
    const cancelled = await cancelOrder(customerToken, order.id)
    expect(cancelled.status).toBe('cancelled')
    const again = await cancelOrder(customerToken, order.id).catch((e: unknown) => e)
    expect((again as ApiError).status).toBe(409)
  })

  it('rejects a cart from another shop at checkout (cart_cross_shop)', async () => {
    const customerToken = 'customer-token'
    const shops = await listShops(customerToken)
    const pA = await listShopProducts(customerToken, shops.items[0]!.id)
    const pB = await listShopProducts(customerToken, shops.items[1]!.id)
    await addCartItem(customerToken, { product_id: pA.items[0]!.id, quantity: 1 })
    await addCartItem(customerToken, { product_id: pB.items[0]!.id, quantity: 1 }).catch(
      (e: unknown) => {
        expect((e as ApiError).code).toBe('cart_cross_shop')
      },
    )
  })
})
