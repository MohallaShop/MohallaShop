'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import type { NavItem } from '@/lib/config/nav'

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Mobile bottom navigation (hidden on md+). App-like, touch-first: large tap
 * targets, horizontally scrollable when a role has many items (admin).
 */
export function BottomNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-1 overflow-x-auto border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition',
              active
                ? 'text-brand-700 dark:text-brand-300'
                : 'text-muted',
            )}
          >
            <Icon className="h-6 w-6" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
