'use client'

import { Header } from './Header'
import { BottomNav } from './BottomNav'
import {
  ADMIN_MOBILE_NAV,
  ADMIN_NAV,
  CUSTOMER_MOBILE_NAV,
  CUSTOMER_NAV,
  RIDER_MOBILE_NAV,
  RIDER_NAV,
  SHOPKEEPER_MOBILE_NAV,
  SHOPKEEPER_NAV,
  type NavItem,
} from '@/lib/config/nav'

export type AppRole = 'customer' | 'shopkeeper' | 'rider' | 'admin'

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  customer: CUSTOMER_NAV,
  shopkeeper: SHOPKEEPER_NAV,
  rider: RIDER_NAV,
  admin: ADMIN_NAV,
}

const MOBILE_NAV_BY_ROLE: Partial<Record<AppRole, NavItem[]>> = {
  admin: ADMIN_MOBILE_NAV,
  customer: CUSTOMER_MOBILE_NAV,
  rider: RIDER_MOBILE_NAV,
  shopkeeper: SHOPKEEPER_MOBILE_NAV,
}

export interface ShellUser {
  name?: string | null
  location?: string | null
  signedIn?: boolean
}

/**
 * Responsive application shell shared by every role surface.
 *
 * Mobile uses the top navbar plus bottom tabs; tablet and desktop use one top
 * navbar with role-specific links and utilities.
 */
export function AppShell({
  role,
  brand,
  user,
  children,
}: {
  role: AppRole
  brand?: string
  user?: ShellUser
  children: React.ReactNode
}) {
  const navItems = NAV_BY_ROLE[role]
  const mobileNavItems = MOBILE_NAV_BY_ROLE[role] ?? navItems

  return (
    <div className="bg-background min-h-dvh">
      <Header
        role={role}
        brand={brand}
        navItems={navItems}
        userName={user?.name}
        location={user?.location}
        signedIn={user?.signedIn ?? true}
      />

      <main>
        <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:px-6 md:py-7 md:pb-12">
          {children}
        </div>
      </main>

      <BottomNav navItems={mobileNavItems} />
    </div>
  )
}
