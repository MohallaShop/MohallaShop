import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { OrderActions } from './OrderActions'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const acceptOrder = vi.fn()
const rejectOrder = vi.fn()
const markPreparing = vi.fn()
const markReady = vi.fn()
vi.mock('@/lib/api/shopkeeper', () => ({
  acceptOrder: (t: string, id: string) => acceptOrder(t, id),
  rejectOrder: (t: string, id: string, i: unknown) => rejectOrder(t, id, i),
  markPreparing: (t: string, id: string) => markPreparing(t, id),
  markReady: (t: string, id: string) => markReady(t, id),
}))

beforeEach(() => {
  refresh.mockReset()
  getBrowserToken.mockReset().mockResolvedValue('token')
  acceptOrder.mockReset().mockResolvedValue({})
  rejectOrder.mockReset().mockResolvedValue({})
  markPreparing.mockReset().mockResolvedValue({})
  markReady.mockReset().mockResolvedValue({})
})

describe('OrderActions', () => {
  it('offers accept and reject for pending orders', () => {
    render(<OrderActions orderId="o-1" status="pending_shop" />)
    expect(screen.getByRole('button', { name: /accept order/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('offers only "mark preparing" for accepted orders', () => {
    render(<OrderActions orderId="o-1" status="accepted" />)
    expect(screen.getByRole('button', { name: /mark as preparing/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark ready/i })).not.toBeInTheDocument()
  })

  it('offers only "mark ready" for preparing orders', () => {
    render(<OrderActions orderId="o-1" status="preparing" />)
    expect(screen.getByRole('button', { name: /mark ready for pickup/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
  })

  it('never shows invalid actions for terminal states', () => {
    for (const status of ['ready_for_pickup', 'rejected', 'cancelled'] as const) {
      const { unmount } = render(<OrderActions orderId="o-1" status={status} />)
      expect(screen.getByText(/no further actions/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('accepts an order through the backend and refreshes', async () => {
    const user = userEvent.setup()
    render(<OrderActions orderId="o-1" status="pending_shop" />)
    await user.click(screen.getByRole('button', { name: /accept order/i }))
    await waitFor(() => expect(acceptOrder).toHaveBeenCalledWith('token', 'o-1'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('rejects with a reason', async () => {
    const user = userEvent.setup()
    render(<OrderActions orderId="o-1" status="pending_shop" />)
    await user.click(screen.getByRole('button', { name: /^reject$/i }))
    await user.type(screen.getByLabelText(/reason/i), 'Out of stock')
    await user.click(screen.getByRole('button', { name: /confirm reject/i }))
    await waitFor(() =>
      expect(rejectOrder).toHaveBeenCalledWith('token', 'o-1', { reason: 'Out of stock' }),
    )
  })

  it('refreshes truth when a concurrent change makes the transition illegal', async () => {
    const user = userEvent.setup()
    acceptOrder.mockRejectedValue(
      new ApiError(409, {
        code: 'illegal_state_transition',
        message: 'Cannot transition order from accepted to accepted',
      }),
    )
    render(<OrderActions orderId="o-1" status="pending_shop" />)
    await user.click(screen.getByRole('button', { name: /accept order/i }))
    expect(await screen.findByText(/order has changed/i)).toBeInTheDocument()
    await waitFor(() => expect(refresh).toHaveBeenCalled(), { timeout: 2000 })
  })

  it('preserves state and shows the backend message on failure', async () => {
    const user = userEvent.setup()
    acceptOrder.mockRejectedValue(new ApiError(500, { code: 'internal_error', message: 'oops' }))
    render(<OrderActions orderId="o-1" status="pending_shop" />)
    await user.click(screen.getByRole('button', { name: /accept order/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/trouble/i)
    expect(screen.getByRole('button', { name: /accept order/i })).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })
})
