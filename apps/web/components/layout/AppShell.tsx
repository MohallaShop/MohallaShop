'use client'

import Link from 'next/link'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import {
  ADMIN_NAV,
  CUSTOMER_MOBILE_NAV,
  CUSTOMER_NAV,
  RIDER_NAV,
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

/** Roles whose full nav is too long for the mobile bottom bar get a subset. */
const MOBILE_NAV_BY_ROLE: Partial<Record<AppRole, NavItem[]>> = {
  customer: CUSTOMER_MOBILE_NAV,
}

export interface ShellUser {
  name?: string | null
  location?: string | null
}

/**
 * Responsive application shell shared by every authenticated surface.
 *
 * - Mobile (<md): app-like — top brand bar + content + bottom navigation.
 * - Desktop (md+): web app — persistent left sidebar; the customer surface
 *   also gets a top header (location, search, account).
 *
 * Takes a serializable `role` (not the nav data, which carries function
 * references and cannot cross the server→client boundary) and resolves the
 * navigation internally.
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
      <Sidebar navItems={navItems} brand={brand} />

      {/* Mobile brand bar */}
      <header className="border-border bg-surface/95 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur md:hidden">
        <span className="bg-brand-600 grid h-7 w-7 place-items-center rounded-lg text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9h16l-1-5H5L4 9Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <Link href="/" className="text-content text-base font-bold">
          {brand ?? 'MohallaShop'}
        </Link>
      </header>

      <div className="md:pl-64">
        {role === 'customer' ? <Header userName={user?.name} location={user?.location} /> : null}
        <main>
          <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 md:px-6 md:py-6 md:pb-12">
            {children}
          </div>
        </main>
      </div>

      <BottomNav navItems={mobileNavItems} />
    </div>
  )
}
