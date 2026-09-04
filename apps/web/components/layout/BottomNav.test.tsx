import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'
import { ADMIN_MOBILE_NAV, CUSTOMER_MOBILE_NAV } from '@/lib/config/nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/cart',
}))

const getCurrentPosition = vi.fn()

beforeEach(() => {
  getCurrentPosition.mockReset()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
})

describe('BottomNav', () => {
  it('uses fixed-width tabs without horizontal scrolling', async () => {
    const user = userEvent.setup()
    render(<BottomNav navItems={CUSTOMER_MOBILE_NAV} />)

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.className).toContain('grid')
    expect(nav.className).toContain('overflow-hidden')
    expect(nav.className).not.toContain('overflow-x-auto')
    expect(screen.getAllByRole('link')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /use current location/i }))
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps admin mobile navigation compact enough for phone widths', () => {
    expect(ADMIN_MOBILE_NAV).toHaveLength(5)
  })
})
