import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { CheckoutForm } from './CheckoutForm'
import type { AddressOut, CartOut } from '@/lib/api/types'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const getCart = vi.fn()
const createOrder = vi.fn()
vi.mock('@/lib/api/cart', () => ({ getCart: (t: string) => getCart(t) }))
vi.mock('@/lib/api/orders', () => ({
  createOrder: (t: string, i: unknown) => createOrder(t, i),
}))

const address: AddressOut = {
  id: 'addr-1',
  label: 'Home',
  line1: '12, Gandhi Chowk',
  line2: null,
  landmark: null,
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  contact_name: null,
  contact_phone: '+919000000001',
  is_default: true,
}

const cart: CartOut = {
  id: 'cart-1',
  shop_id: 'shop-1',
  items: [
    {
      id: 'item-1',
      product_id: 'prod-1',
      product_name: 'Wheat Atta',
      unit: '1 kg',
      unit_price: '52.00',
      image_url: null,
      quantity: 2,
      line_total: '104.00',
    },
  ],
}

beforeEach(() => {
  push.mockReset()
  getBrowserToken.mockReset().mockResolvedValue('token')
  getCart.mockReset().mockResolvedValue(cart)
  createOrder.mockReset()
})

describe('CheckoutForm', () => {
  it('prompts for an address when none exist', () => {
    render(<CheckoutForm addresses={[]} cart={cart} />)
    expect(screen.getByText('No saved address')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add an address/i })).toBeInTheDocument()
  })

  it('places an order with the selected address and notes', async () => {
    const user = userEvent.setup()
    createOrder.mockResolvedValue({
      id: 'order-1',
      order_no: 'MS-ABC123',
      status: 'pending_shop',
      total_amount: '104.00',
      item_count: 1,
      placed_at: '2026-08-10T10:00:00Z',
    })
    render(<CheckoutForm addresses={[address]} cart={cart} />)
    await user.type(screen.getByLabelText(/notes for the shop/i), 'Fresh please')
    await user.click(screen.getByRole('button', { name: /place order/i }))
    await waitFor(() =>
      expect(createOrder).toHaveBeenCalledWith('token', {
        address_id: 'addr-1',
        notes: 'Fresh please',
      }),
    )
    await waitFor(() => expect(push).toHaveBeenCalledWith('/orders/order-1?placed=1'))
  })

  it('shows a friendly message for an empty cart conflict', async () => {
    const user = userEvent.setup()
    getCart.mockResolvedValue({ id: 'cart-1', shop_id: null, items: [] })
    createOrder.mockRejectedValue(new ApiError(409, { code: 'empty_cart', message: 'empty' }))
    render(<CheckoutForm addresses={[address]} cart={cart} />)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cart is empty/i)
  })

  it('surfaces insufficient stock clearly', async () => {
    const user = userEvent.setup()
    createOrder.mockRejectedValue(
      new ApiError(409, {
        code: 'insufficient_inventory',
        message: 'Insufficient stock for an item',
      }),
    )
    render(<CheckoutForm addresses={[address]} cart={cart} />)
    await user.click(screen.getByRole('button', { name: /place order/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/out of stock/i)
  })

  it('displays Cash on Delivery as the only payment method', () => {
    render(<CheckoutForm addresses={[address]} cart={cart} />)
    expect(screen.getByText('Cash on Delivery')).toBeInTheDocument()
  })
})
