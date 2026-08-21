import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/lib/api/client'
import { RiderStatusCard } from './RiderStatusCard'

const routerPush = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

const getBrowserToken = vi.fn()
vi.mock('@/lib/api/browser', () => ({ getBrowserToken: () => getBrowserToken() }))

const goOnline = vi.fn()
const goOffline = vi.fn()
vi.mock('@/lib/api/rider', () => ({
  goOnline: (t: string) => goOnline(t),
  goOffline: (t: string) => goOffline(t),
}))

beforeEach(() => {
  routerPush.mockReset()
  refresh.mockReset()
  getBrowserToken.mockReset().mockResolvedValue('token')
  goOnline.mockReset().mockResolvedValue({})
  goOffline.mockReset().mockResolvedValue({})
})

describe('RiderStatusCard', () => {
  it('shows the offline state and an offline CTA', () => {
    render(<RiderStatusCard isOnline={false} activeDeliveries={0} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go online/i })).toBeInTheDocument()
  })

  it('shows the online state and an online CTA', () => {
    render(<RiderStatusCard isOnline={true} activeDeliveries={2} />)
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /go offline/i })).toBeInTheDocument()
    expect(screen.getByText(/2 active deliveries/i)).toBeInTheDocument()
  })

  it('goes online through the backend and refreshes', async () => {
    const user = userEvent.setup()
    render(<RiderStatusCard isOnline={false} activeDeliveries={0} />)
    await user.click(screen.getByRole('button', { name: /go online/i }))
    await waitFor(() => expect(goOnline).toHaveBeenCalledWith('token'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('goes offline through the backend and refreshes', async () => {
    const user = userEvent.setup()
    render(<RiderStatusCard isOnline={true} activeDeliveries={1} />)
    await user.click(screen.getByRole('button', { name: /go offline/i }))
    await waitFor(() => expect(goOffline).toHaveBeenCalledWith('token'))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('sends guests to sign in instead of toggling', async () => {
    const user = userEvent.setup()
    getBrowserToken.mockResolvedValue(null)
    render(<RiderStatusCard isOnline={false} activeDeliveries={0} />)
    await user.click(screen.getByRole('button', { name: /go online/i }))
    expect(routerPush).toHaveBeenCalledWith('/login?next=/rider/dashboard')
    expect(goOnline).not.toHaveBeenCalled()
  })

  it('shows a human-readable backend error on failure', async () => {
    const user = userEvent.setup()
    goOnline.mockRejectedValue(new ApiError(500, { code: 'internal_error', message: 'oops' }))
    render(<RiderStatusCard isOnline={false} activeDeliveries={0} />)
    await user.click(screen.getByRole('button', { name: /go online/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/trouble/i)
    expect(refresh).not.toHaveBeenCalled()
  })
})
