import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { ProductCard } from './ProductCard'
import { AddProductButton } from './AddProductButton'
import type { ProductOut } from '@/lib/api/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const addCartItem = vi.fn()
const clearCart = vi.fn()
vi.mock('@/lib/api/cart', () => ({
  addCartItem: (t: string, i: unknown) => addCartItem(t, i),
  clearCart: (t: string) => clearCart(t),
}))

beforeEach(() => {
  getBrowserToken.mockReset().mockResolvedValue('token')
  addCartItem.mockReset()
  clearCart.mockReset()
})

const product: ProductOut = {
  id: 'prod-1',
  shop_id: 'shop-1',
  name: 'Wheat Atta',
  description: 'Fortified',
  price: '52.00',
  unit: '1 kg',
  image_url: null,
  in_stock: true,
  category_id: null,
}

const outOfStock: ProductOut = { ...product, id: 'prod-2', in_stock: false }

describe('ProductCard', () => {
  it('shows name, price, unit and stock status', () => {
    render(<ProductCard product={product} />)
    expect(screen.getByText('Wheat Atta')).toBeInTheDocument()
    expect(screen.getByText(/₹52/)).toBeInTheDocument()
    expect(screen.getByText(/1 kg/)).toBeInTheDocument()
    expect(screen.getByText('In stock')).toBeInTheDocument()
  })

  it('marks unavailable products and disables adding', () => {
    render(<ProductCard product={outOfStock} />)
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'Unavailable' })
    expect(btn).toBeDisabled()
  })
})

describe('AddProductButton', () => {
  it('adds the product to the cart', async () => {
    const user = userEvent.setup()
    addCartItem.mockResolvedValue({ id: 'cart', shop_id: 'shop-1', items: [] })
    render(<AddProductButton productId="prod-1" shopId="shop-1" />)
    await user.click(screen.getByRole('button', { name: /add to cart/i }))
    await waitFor(() =>
      expect(addCartItem).toHaveBeenCalledWith('token', { product_id: 'prod-1', quantity: 1 }),
    )
    expect(await screen.findByText('Added ✓')).toBeInTheDocument()
  })

  it('offers to switch shop on a cross-shop conflict', async () => {
    const user = userEvent.setup()
    addCartItem.mockRejectedValue(
      new ApiError(409, { code: 'cart_cross_shop', message: 'Cart already has another shop' }),
    )
    render(<AddProductButton productId="prod-1" shopId="shop-1" />)
    await user.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(await screen.findByText(/another shop/i)).toBeInTheDocument()

    addCartItem.mockResolvedValue({ id: 'cart', shop_id: 'shop-1', items: [] })
    await user.click(screen.getByRole('button', { name: /empty & add/i }))
    await waitFor(() => expect(clearCart).toHaveBeenCalledWith('token'))
    expect(addCartItem).toHaveBeenLastCalledWith('token', { product_id: 'prod-1', quantity: 1 })
  })

  it('shows a human-readable backend error on failure', async () => {
    const user = userEvent.setup()
    addCartItem.mockRejectedValue(new ApiError(422, { code: 'validation_failed', message: 'bad' }))
    render(<AddProductButton productId="prod-1" shopId="shop-1" />)
    await user.click(screen.getByRole('button', { name: /add to cart/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('bad')
  })
})
