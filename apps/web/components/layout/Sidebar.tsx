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
 * Desktop vertical navigation (hidden on mobile). Optional `footer` slot is
 * rendered below the nav (e.g. the customer BNPL promo card).
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
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="bg-brand-600 shadow-card grid h-9 w-9 place-items-center rounded-xl text-white">
          <StoreIconSmall />
        </span>
        <span className="leading-tight">
          <span className="text-content block text-lg font-bold">{brand ?? siteConfig.shortName}</span>
          <span className="text-muted block text-[11px]">{siteConfig.tagline}</span>
        </span>
      </div>
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
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                active
                  ? 'bg-brand-100 text-brand-700 font-semibold'
                  : 'text-content/80 hover:bg-brand-50 hover:text-content font-medium',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-brand-600' : 'text-muted')} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="bg-brand-600 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>
      {footer ? <div className="p-4">{footer}</div> : null}
    </aside>
  )
}

function StoreIconSmall() {
  return (
    <svg
      width="18"
      height="18"
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
