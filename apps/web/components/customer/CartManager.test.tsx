import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { CartManager } from './CartManager'
import type { CartOut } from '@/lib/api/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const getCart = vi.fn()
const updateCartItem = vi.fn()
const deleteCartItem = vi.fn()
const clearCart = vi.fn()
vi.mock('@/lib/api/cart', () => ({
  getCart: (t: string) => getCart(t),
  updateCartItem: (t: string, id: string, i: unknown) => updateCartItem(t, id, i),
  deleteCartItem: (t: string, id: string) => deleteCartItem(t, id),
  clearCart: (t: string) => clearCart(t),
}))

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
    {
      id: 'item-2',
      product_id: 'prod-2',
      product_name: 'Milk',
      unit: '500 ml',
      unit_price: '25.00',
      image_url: null,
      quantity: 1,
      line_total: '25.00',
    },
  ],
}

beforeEach(() => {
  getBrowserToken.mockReset().mockResolvedValue('token')
  getCart.mockReset().mockResolvedValue(cart)
  updateCartItem.mockReset().mockResolvedValue(cart)
  deleteCartItem.mockReset().mockResolvedValue({ ...cart, items: [cart.items[0]] })
  clearCart.mockReset().mockResolvedValue({ id: 'cart-1', shop_id: null, items: [] })
})

describe('CartManager', () => {
  it('renders cart lines with server-provided totals', () => {
    render(<CartManager initial={cart} />)
    expect(screen.getByText('Wheat Atta')).toBeInTheDocument()
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText(/₹104/)).toBeInTheDocument()
    expect(screen.getByText(/Estimated subtotal/i)).toBeInTheDocument()
  })

  it('shows an empty state with a browse action', () => {
    render(<CartManager initial={{ id: 'cart-1', shop_id: null, items: [] }} />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse shops/i })).toBeInTheDocument()
  })

  it('updates a quantity through the backend', async () => {
    const user = userEvent.setup()
    updateCartItem.mockResolvedValue({
      ...cart,
      items: [{ ...cart.items[0]!, quantity: 3, line_total: '156.00' }, cart.items[1]],
    })
    render(<CartManager initial={cart} />)
    const qty = screen.getByLabelText(/quantity for wheat atta/i)
    const incButtons = screen.getAllByRole('button', { name: /increase quantity/i })
    await user.click(incButtons[0]!)
    await waitFor(() =>
      expect(updateCartItem).toHaveBeenCalledWith('token', 'item-1', { quantity: 3 }),
    )
    expect(qty).toHaveTextContent('3')
  })

  it('removes an item through the backend', async () => {
    const user = userEvent.setup()
    render(<CartManager initial={cart} />)
    await user.click(screen.getAllByRole('button', { name: /remove/i })[0]!)
    await waitFor(() => expect(deleteCartItem).toHaveBeenCalledWith('token', 'item-1'))
  })

  it('offers emptying the cart to switch shops', async () => {
    const user = userEvent.setup()
    render(<CartManager initial={cart} />)
    await user.click(screen.getByRole('button', { name: /empty cart to switch shops/i }))
    await waitFor(() => expect(clearCart).toHaveBeenCalledWith('token'))
  })

  it('shows a friendly message when a mutation conflicts', async () => {
    const user = userEvent.setup()
    updateCartItem.mockRejectedValue(
      new ApiError(409, { code: 'insufficient_inventory', message: 'Insufficient stock' }),
    )
    render(<CartManager initial={cart} />)
    const incButtons = screen.getAllByRole('button', { name: /increase quantity/i })
    await user.click(incButtons[0]!)
    expect(await screen.findByRole('alert')).toHaveTextContent(/insufficient stock/i)
  })
})
