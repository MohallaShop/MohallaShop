'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LocationPermissionButton } from './LocationPermissionButton'
import type { NavItem } from '@/lib/config/nav'

function isActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Mobile bottom navigation (hidden on md+). App-like, touch-first tabs that
 * always fit within the viewport instead of becoming a horizontal scroller.
 */
export function BottomNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 grid min-h-[calc(4.5rem+env(safe-area-inset-bottom))] items-stretch gap-0.5 overflow-hidden border-t px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        if (item.action === 'location') {
          return <LocationPermissionButton key={item.label} variant="bottom" active={active} />
        }
        if (!item.href) return null
        return (
          <Link
            key={item.href ?? item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-none transition min-[360px]:text-[11px]',
              active
                ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'text-muted hover:bg-surface-hover hover:text-content',
            )}
          >
            <Icon className="h-5 w-5 shrink-0 min-[360px]:h-5.5 min-[360px]:w-5.5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
