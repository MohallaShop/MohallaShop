import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { CancelOrderButton } from './CancelOrderButton'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const cancelOrder = vi.fn()
vi.mock('@/lib/api/orders', () => ({
  cancelOrder: (t: string, id: string) => cancelOrder(t, id),
}))

beforeEach(() => {
  refresh.mockReset()
  getBrowserToken.mockReset().mockResolvedValue('token')
  cancelOrder.mockReset().mockResolvedValue({})
})

describe('CancelOrderButton', () => {
  it('is rendered only for pending_shop and accepted orders', () => {
    const pending = render(<CancelOrderButton orderId="o-1" status="pending_shop" />)
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
    pending.unmount()

    const accepted = render(<CancelOrderButton orderId="o-1" status="accepted" />)
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument()
    accepted.unmount()

    for (const s of ['preparing', 'ready_for_pickup', 'rejected', 'cancelled'] as const) {
      const { container, unmount } = render(<CancelOrderButton orderId="o-1" status={s} />)
      expect(container.querySelector('button')).toBeNull()
      unmount()
    }
  })

  it('requires confirmation before cancelling', async () => {
    const user = userEvent.setup()
    render(<CancelOrderButton orderId="o-1" status="pending_shop" />)
    await user.click(screen.getByRole('button', { name: /cancel order/i }))
    expect(screen.getByText(/cancel this order/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /yes, cancel/i }))
    await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith('token', 'o-1'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('surfaces an illegal-transition response honestly', async () => {
    const user = userEvent.setup()
    cancelOrder.mockRejectedValue(
      new ApiError(409, { code: 'illegal_state_transition', message: 'Cannot cancel now' }),
    )
    render(<CancelOrderButton orderId="o-1" status="accepted" />)
    await user.click(screen.getByRole('button', { name: /cancel order/i }))
    await user.click(screen.getByRole('button', { name: /yes, cancel/i }))
    expect(await screen.findByText(/can no longer be cancelled/i)).toBeInTheDocument()
  })
})
