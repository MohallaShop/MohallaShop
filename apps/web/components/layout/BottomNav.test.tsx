import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from './BottomNav'
import { ADMIN_MOBILE_NAV, CUSTOMER_MOBILE_NAV } from '@/lib/config/nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/cart',
}))

describe('BottomNav', () => {
  it('uses fixed-width tabs without horizontal scrolling', () => {
    render(<BottomNav navItems={CUSTOMER_MOBILE_NAV} />)

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav.className).toContain('grid')
    expect(nav.className).toContain('overflow-hidden')
    expect(nav.className).not.toContain('overflow-x-auto')
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/home')
    expect(screen.queryByRole('button', { name: /use current location/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps admin mobile navigation compact enough for phone widths', () => {
    expect(ADMIN_MOBILE_NAV).toHaveLength(5)
  })
})
