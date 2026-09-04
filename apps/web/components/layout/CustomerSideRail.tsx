'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarIcon,
  CreditCardIcon,
  GiftIcon,
  GridIcon,
  HeartIcon,
  HelpCircleIcon,
  LockIcon,
  ReceiptIcon,
  StoreIcon,
  StorePlusIcon,
  WalletIcon,
} from '@/components/icons'
import { LocationPermissionButton } from './LocationPermissionButton'
import { cn } from '@/lib/utils/cn'
import type { IconType } from '@/lib/config/nav'

type RailLink = {
  label: string
  href: string
  icon: IconType
}

type LockedRailItem = {
  label: string
  icon: IconType
  badge?: string
}

const SHOPPING_LINKS: RailLink[] = [
  { label: 'Browse Shops', href: '/shops', icon: StoreIcon },
  { label: 'Categories', href: '/categories', icon: GridIcon },
  { label: 'My Orders', href: '/orders', icon: ReceiptIcon },
  { label: 'Favorites', href: '/favorites', icon: HeartIcon },
]

const LOCKED_FEATURES: LockedRailItem[] = [
  { label: 'Wallet', icon: WalletIcon },
  { label: 'Credits & Loans', icon: CreditCardIcon, badge: 'New' },
  { label: 'Subscriptions', icon: CalendarIcon },
  { label: 'Refer & Earn', icon: GiftIcon },
  { label: 'Become a Seller', icon: StorePlusIcon },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function CustomerSideRail() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:block">
      <nav
        aria-label="Customer shortcuts"
        className="scrollbar-thin sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1"
      >
        <div className="border-border bg-surface shadow-card rounded-2xl border p-2">
          <LocationPermissionButton active={false} />

          <div className="mt-1 space-y-1">
            {SHOPPING_LINKS.map((item) => {
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
                      ? 'bg-brand-100/80 font-bold text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-content/75 font-medium hover:bg-surface-hover hover:text-content',
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
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="border-border my-3 border-t" />

          <div className="space-y-1">
            {LOCKED_FEATURES.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="text-muted flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium opacity-65"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-brand-500/10 text-brand-700 ring-brand-500/20 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 dark:text-brand-300">
                      {item.badge}
                    </span>
                  ) : (
                    <LockIcon className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-border my-3 border-t" />

          <Link
            href="/support"
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
              isActive(pathname, '/support')
                ? 'bg-brand-100/80 font-bold text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-300'
                : 'text-content/75 font-medium hover:bg-surface-hover hover:text-content',
            )}
          >
            <HelpCircleIcon className="text-muted group-hover:text-brand-500 h-5 w-5 shrink-0 transition-colors" />
            <span className="min-w-0 flex-1 truncate">Support</span>
          </Link>
        </div>
      </nav>
    </aside>
  )
}
