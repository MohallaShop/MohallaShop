import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { DeliveryActions } from './DeliveryActions'

const routerPush = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const pickDelivery = vi.fn()
const completeDelivery = vi.fn()
const failDelivery = vi.fn()
vi.mock('@/lib/api/rider', () => ({
  pickDelivery: (t: string, id: string) => pickDelivery(t, id),
  completeDelivery: (t: string, id: string) => completeDelivery(t, id),
  failDelivery: (t: string, id: string, d: unknown) => failDelivery(t, id, d),
}))

beforeEach(() => {
  routerPush.mockReset()
  refresh.mockReset()
  getBrowserToken.mockReset().mockResolvedValue('token')
  pickDelivery.mockReset().mockResolvedValue({})
  completeDelivery.mockReset().mockResolvedValue({})
  failDelivery.mockReset().mockResolvedValue({})
})

describe('DeliveryActions', () => {
  it('offers pick up for assigned deliveries', () => {
    render(<DeliveryActions deliveryId="d-1" status="assigned" />)
    expect(screen.getByRole('button', { name: /pick up/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark delivered/i })).not.toBeInTheDocument()
  })

  it('offers complete and fail for picked-up deliveries', () => {
    render(<DeliveryActions deliveryId="d-1" status="picked_up" />)
    expect(screen.getByRole('button', { name: /mark delivered/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark failed/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pick up/i })).not.toBeInTheDocument()
  })

  it('shows only a note for terminal states', () => {
    for (const status of ['delivered', 'failed'] as const) {
      const { unmount } = render(<DeliveryActions deliveryId="d-1" status={status} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('sends guests to sign in instead of picking up', async () => {
    const user = userEvent.setup()
    getBrowserToken.mockResolvedValue(null)
    render(<DeliveryActions deliveryId="d-1" status="assigned" />)
    await user.click(screen.getByRole('button', { name: /pick up/i }))
    expect(routerPush).toHaveBeenCalledWith('/login?next=/rider/deliveries')
    expect(pickDelivery).not.toHaveBeenCalled()
  })

  it('picks up a delivery through the backend and refreshes', async () => {
    const user = userEvent.setup()
    render(<DeliveryActions deliveryId="d-1" status="assigned" />)
    await user.click(screen.getByRole('button', { name: /pick up/i }))
    await waitFor(() => expect(pickDelivery).toHaveBeenCalledWith('token', 'd-1'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('marks a delivery complete with a reason', async () => {
    const user = userEvent.setup()
    render(<DeliveryActions deliveryId="d-1" status="picked_up" />)
    await user.click(screen.getByRole('button', { name: /mark delivered/i }))
    await waitFor(() => expect(completeDelivery).toHaveBeenCalledWith('token', 'd-1'))
  })

  it('fails a delivery with a reason', async () => {
    const user = userEvent.setup()
    render(<DeliveryActions deliveryId="d-1" status="picked_up" />)
    await user.click(screen.getByRole('button', { name: /mark failed/i }))
    await user.type(screen.getByLabelText(/reason/i), 'Customer not reachable')
    await user.click(screen.getByRole('button', { name: /confirm failure/i }))
    await waitFor(() =>
      expect(failDelivery).toHaveBeenCalledWith('token', 'd-1', {
        reason: 'Customer not reachable',
      }),
    )
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('refreshes truth when a concurrent change makes the transition illegal', async () => {
    const user = userEvent.setup()
    pickDelivery.mockRejectedValue(
      new ApiError(409, {
        code: 'illegal_state_transition',
        message: 'Order is not awaiting pickup',
      }),
    )
    render(<DeliveryActions deliveryId="d-1" status="assigned" />)
    await user.click(screen.getByRole('button', { name: /pick up/i }))
    expect(await screen.findByText(/delivery has changed/i)).toBeInTheDocument()
    await waitFor(() => expect(refresh).toHaveBeenCalled(), { timeout: 2000 })
  })

  it('preserves state and shows the backend message on failure', async () => {
    const user = userEvent.setup()
    pickDelivery.mockRejectedValue(new ApiError(500, { code: 'internal_error', message: 'oops' }))
    render(<DeliveryActions deliveryId="d-1" status="assigned" />)
    await user.click(screen.getByRole('button', { name: /pick up/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/trouble/i)
    expect(screen.getByRole('button', { name: /pick up/i })).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })
})
