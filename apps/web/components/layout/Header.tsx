'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CartIcon, SearchIcon, StoreIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/utils/cn'
import { siteConfig } from '@/lib/config/site'
import { LocationPermissionButton } from './LocationPermissionButton'
import type { NavItem } from '@/lib/config/nav'

type ShellRole = 'customer' | 'shopkeeper' | 'rider' | 'admin'

export function Header({
  role,
  brand,
  navItems,
  userName,
  signedIn = true,
}: {
  role: ShellRole
  brand?: string
  navItems: NavItem[]
  userName?: string | null
  location?: string | null
  signedIn?: boolean
  notificationCount?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const firstName = userName?.trim().split(/\s+/)[0] ?? null
  const isCustomer = role === 'customer'
  const isSearchPage = pathname === '/search'
  const showCustomerHeaderSearch = isCustomer && !isSearchPage

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <header className="border-border bg-surface/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link href={roleHome(role)} className="flex shrink-0 items-center gap-2">
          <span className="bg-brand-600 shadow-card grid h-9 w-9 place-items-center rounded-lg text-white">
            <StoreIcon className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="text-content block text-base font-extrabold md:text-lg">
              {brand ?? siteConfig.shortName}
            </span>
            <span className="text-muted hidden text-xs font-medium xl:block">
              {roleLabel(role)}
            </span>
          </span>
        </Link>

        {!isCustomer ? (
          <nav
            aria-label="Primary"
            className="scrollbar-none hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item.href)
              if (!item.href) return null
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition',
                    active
                      ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
                      : 'text-content/70 hover:bg-surface-hover hover:text-content',
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        ) : null}

        {showCustomerHeaderSearch ? (
          <SearchForm
            value={q}
            onChange={setQ}
            onSubmit={submit}
            className="hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg"
          />
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isCustomer ? (
            <CustomerActions signedIn={signedIn} firstName={firstName} />
          ) : (
            <>
              <Link
                href="/home"
                className="text-content/70 hover:text-content hover:bg-surface-hover hidden rounded-lg px-3 py-2 text-sm font-semibold transition lg:inline-flex"
              >
                Customer site
              </Link>
              <Link
                href={accountHref(role)}
                aria-label="Account"
                className="hover:bg-surface-hover flex items-center gap-2 rounded-lg px-2 py-1.5 transition"
              >
                <span className="bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-brand-500/20 grid h-9 w-9 place-items-center rounded-full text-sm font-bold ring-1">
                  {firstName ? firstName.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
                </span>
                <span className="hidden leading-tight xl:block">
                  <span className="text-content block text-sm font-bold">
                    {firstName ? firstName : accountLabel(role)}
                  </span>
                  <span className="text-muted block text-[11px] font-medium">Account</span>
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {isCustomer ? (
        <div className="border-border space-y-2 border-t px-4 py-2 md:hidden">
          <LocationPermissionButton variant="header" />
          {showCustomerHeaderSearch ? (
            <SearchForm value={q} onChange={setQ} onSubmit={submit} />
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

function CustomerActions({
  signedIn,
  firstName,
}: {
  signedIn: boolean
  firstName: string | null
}) {
  return (
    <>
      <Link
        href="/cart"
        className="border-border bg-surface text-content hover:bg-surface-hover inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-bold transition min-[360px]:px-3"
      >
        <CartIcon className="h-4.5 w-4.5" />
        <span>Cart</span>
      </Link>
      <Link
        href={signedIn ? '/profile' : '/login'}
        aria-label={signedIn ? 'Account' : 'Sign in'}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-bold transition min-[360px]:px-4',
          signedIn
            ? 'border-border bg-surface text-content hover:bg-surface-hover border'
            : 'bg-brand-600 text-white hover:bg-brand-700',
        )}
      >
        {signedIn ? (
          <span className="max-w-20 truncate">{firstName ?? 'Account'}</span>
        ) : (
          'Sign in'
        )}
      </Link>
    </>
  )
}

function SearchForm({
  value,
  onChange,
  onSubmit,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  className?: string
}) {
  return (
    <form onSubmit={onSubmit} role="search" className={className}>
      <div className="relative">
        <SearchIcon className="text-muted pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search milk, apples, medicine"
          aria-label="Search products"
          className="border-border bg-background text-content focus:border-brand-500 block h-10 w-full rounded-lg border pl-10 pr-12 text-sm outline-none transition"
        />
        <button
          type="submit"
          aria-label="Search"
          className="bg-brand-600 hover:bg-brand-700 absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-white transition"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

function isActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function roleHome(role: ShellRole): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'shopkeeper') return '/shop'
  if (role === 'rider') return '/rider/dashboard'
  return '/home'
}

function accountHref(role: ShellRole): string {
  if (role === 'admin') return '/admin/settings'
  if (role === 'shopkeeper') return '/shop'
  if (role === 'rider') return '/rider/profile'
  return '/profile'
}

function accountLabel(role: ShellRole): string {
  if (role === 'admin') return 'Admin'
  if (role === 'shopkeeper') return 'Partner'
  if (role === 'rider') return 'Rider'
  return 'Account'
}

function roleLabel(role: ShellRole): string {
  if (role === 'admin') return 'Admin control center'
  if (role === 'shopkeeper') return 'Partner dashboard'
  if (role === 'rider') return 'Rider workspace'
  return siteConfig.tagline
}
