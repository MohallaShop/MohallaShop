'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { siteConfig } from '@/lib/config/site'
import type { NavItem } from '@/lib/config/nav'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Desktop vertical navigation (hidden on mobile). Premium feel with active
 * indicator, hover effects, and a buy-now-pay-later promo card at the bottom.
 */
export function Sidebar({
  navItems,
  brand,
  footer,
}: {
  navItems: NavItem[]
  brand?: string
  footer?: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r md:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <span className="bg-brand-600 shadow-card grid h-10 w-10 place-items-center rounded-2xl text-white">
          <StoreIconSmall />
        </span>
        <span className="leading-tight">
          <span className="text-content block text-lg font-extrabold">
            {brand ?? siteConfig.shortName}
          </span>
          <span className="text-muted block text-xs font-medium">{siteConfig.tagline}</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                active
                  ? 'bg-brand-100/80 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold shadow-sm'
                  : 'text-content/70 hover:bg-surface-hover hover:text-content font-medium',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-muted group-hover:text-brand-500',
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-brand-600 rounded-full px-2 py-0.5 text-xs font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {/* Footer promo or custom slot */}
      {footer ?? (
        <div className="p-4">
          <div className="border-border bg-surface-hover rounded-2xl border p-4">
            <p className="text-content text-xs font-bold">Buy Now, Pay Later</p>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Shop now and pay within 15–30 days.
            </p>
            <button className="bg-brand-600 hover:bg-brand-700 mt-2.5 w-full rounded-xl py-1.5 text-xs font-bold text-white transition">
              Activate Credit
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

function StoreIconSmall() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 9h16l-1-5H5L4 9Z" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
