'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme, type Theme } from '@/components/providers/ThemeProvider'
import {
  BellIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  MapPinIcon,
  MoonIcon,
  SearchIcon,
  StoreIcon,
  SunIcon,
  UserIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils/cn'
import { siteConfig } from '@/lib/config/site'
import type { NavItem } from '@/lib/config/nav'

type ShellRole = 'customer' | 'shopkeeper' | 'rider' | 'admin'

export function Header({
  role,
  brand,
  navItems,
  userName,
  location,
  signedIn = true,
  notificationCount = 0,
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
  const utility = utilityLink(role)

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

        <nav
          aria-label="Primary"
          className="scrollbar-none hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(pathname, item.href)
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

        {isCustomer ? (
          <SearchForm
            value={q}
            onChange={setQ}
            onSubmit={submit}
            className="hidden w-full max-w-sm shrink lg:block"
          />
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isCustomer ? (
            <Link
              href={signedIn ? '/profile' : '/login'}
              className="hover:bg-surface-hover hidden items-center gap-2 rounded-lg px-2 py-1.5 transition xl:flex"
            >
              <span className="bg-brand-500/10 grid h-8 w-8 place-items-center rounded-lg">
                <MapPinIcon className="text-brand-700 dark:text-brand-300 h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="text-muted block text-[10px] font-semibold uppercase">
                  Deliver to
                </span>
                <span className="text-content flex items-center gap-1 text-sm font-bold">
                  {location ?? (signedIn ? 'Set location' : 'Sign in')}
                  <ChevronDownIcon className="text-muted h-3.5 w-3.5" />
                </span>
              </span>
            </Link>
          ) : (
            <Link
              href="/home"
              className="text-content/70 hover:text-content hover:bg-surface-hover hidden rounded-lg px-3 py-2 text-sm font-semibold transition lg:inline-flex"
            >
              Customer site
            </Link>
          )}

          {utility ? (
            <Link
              href={utility.href}
              className="text-content/70 hover:text-content hover:bg-surface-hover hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold transition sm:flex"
            >
              <HelpCircleIcon className="h-5 w-5" />
              <span className="hidden xl:inline">{utility.label}</span>
            </Link>
          ) : null}

          <ThemeSwitcher />

          {signedIn ? (
            <>
              {isCustomer ? (
                <Link
                  href="/orders"
                  aria-label="Orders and notifications"
                  className="text-content/70 hover:text-content hover:bg-surface-hover relative rounded-lg p-2 transition"
                >
                  <BellIcon className="h-5 w-5" />
                  {notificationCount > 0 ? (
                    <span className="bg-brand-600 absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm">
                      {notificationCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}

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
          ) : (
            <Link
              href="/login"
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {isCustomer ? (
        <div className="border-border border-t px-4 py-2 md:hidden">
          <SearchForm value={q} onChange={setQ} onSubmit={submit} />
        </div>
      ) : null}
    </header>
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

function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  function cycleTheme() {
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
    setTheme(next[theme])
  }

  return (
    <>
      <div className="border-border bg-background hidden rounded-lg border p-0.5 sm:flex">
        {(['light', 'dark', 'system'] as Theme[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            aria-pressed={theme === option}
            className={cn(
              'h-8 rounded-md px-2.5 text-xs font-semibold capitalize transition',
              theme === option
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content hover:bg-surface-hover',
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`Current theme: ${theme}. Click to cycle theme.`}
        className="text-content/70 hover:text-content hover:bg-surface-hover grid h-10 w-10 place-items-center rounded-lg transition sm:hidden"
        title={`Theme: ${theme}`}
      >
        {resolvedTheme === 'dark' ? (
          <SunIcon className="h-5 w-5 text-amber-400" />
        ) : (
          <MoonIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        )}
      </button>
    </>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function roleHome(role: ShellRole): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'shopkeeper') return '/shop'
  if (role === 'rider') return '/rider/dashboard'
  return '/home'
}

function utilityLink(role: ShellRole): { href: string; label: string } | null {
  if (role === 'customer') return { href: '/support', label: 'Support' }
  if (role === 'shopkeeper') return { href: '/shop/orders', label: 'Orders' }
  if (role === 'rider') return { href: '/rider/deliveries', label: 'Deliveries' }
  return null
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
