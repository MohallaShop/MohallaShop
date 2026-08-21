'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
  BellIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  MapPinIcon,
  MoonIcon,
  SearchIcon,
  SparklesIcon,
  SunIcon,
} from '@/components/icons'

/**
 * Premium desktop top bar for the customer shell. Location, search, help,
 * notifications, user avatar, and theme toggle. Guests see a Sign in button.
 */
export function Header({
  userName,
  location,
  signedIn = true,
  notificationCount = 0,
}: {
  userName?: string | null
  location?: string | null
  signedIn?: boolean
  notificationCount?: number
}) {
  const router = useRouter()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [q, setQ] = useState('')
  const firstName = userName?.trim().split(/\s+/)[0] ?? null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  function cycleTheme() {
    const next: Record<string, string> = { light: 'dark', dark: 'system', system: 'light' }
    setTheme(next[theme] as 'light' | 'dark' | 'system')
  }

  return (
    <header className="border-border bg-background/80 sticky top-0 z-20 hidden h-16 items-center gap-6 border-b px-6 backdrop-blur-md md:flex">
      {/* Location */}
      <Link
        href={signedIn ? '/profile' : '/login'}
        className="hover:bg-surface-hover flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 transition"
      >
        <span className="bg-brand-100 dark:bg-brand-900/40 grid h-8 w-8 place-items-center rounded-lg">
          <MapPinIcon className="text-brand-600 dark:text-brand-400 h-4 w-4" />
        </span>
        <span className="leading-tight">
          <span className="text-muted block text-[10px] font-medium uppercase tracking-wide">
            Deliver to
          </span>
          <span className="text-content flex items-center gap-1 text-sm font-bold">
            {location ?? (signedIn ? 'Set your location' : 'Sign in to set address')}
            <ChevronDownIcon className="text-muted h-3.5 w-3.5" />
          </span>
        </span>
      </Link>

      {/* Search */}
      <form onSubmit={submit} role="search" className="flex flex-1 justify-center">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for anything (milk, apple, medicine…)"
            aria-label="Search"
            className="border-border bg-surface text-content focus:border-brand-400 focus:shadow-glow block w-full rounded-2xl border py-2.5 pl-11 pr-24 text-sm shadow-sm outline-none transition-all"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <SparklesIcon className="text-brand-400 hidden h-5 w-5 lg:block" />
            <button
              type="submit"
              aria-label="Search"
              className="bg-brand-600 hover:bg-brand-700 shadow-brand-200 grid h-9 w-9 place-items-center rounded-xl text-white shadow-md transition-all hover:shadow-lg"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/support"
          className="text-content/70 hover:text-content hover:bg-surface-hover flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium transition"
        >
          <HelpCircleIcon className="h-5 w-5" />
          <span className="hidden lg:inline">Help</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          aria-label={`Current theme: ${theme}. Click to cycle.`}
          className="text-content/70 hover:text-content hover:bg-surface-hover flex items-center justify-center rounded-xl p-1.5 transition"
          title={`Theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`}
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-5 w-5 text-amber-400" />
          ) : (
            <MoonIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        {signedIn ? (
          <>
            {/* Notifications */}
            <Link
              href="/orders"
              aria-label="Notifications"
              className="text-content/70 hover:text-content hover:bg-surface-hover relative rounded-xl p-1.5 transition"
            >
              <BellIcon className="h-5 w-5" />
              {notificationCount > 0 ? (
                <span className="bg-brand-600 absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm">
                  {notificationCount}
                </span>
              ) : null}
            </Link>

            {/* User */}
            <Link
              href="/profile"
              className="hover:bg-surface-hover flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition"
            >
              <span className="bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 ring-brand-200/50 dark:ring-brand-800/50 grid h-9 w-9 place-items-center rounded-full text-sm font-bold ring-2">
                {firstName ? firstName.charAt(0).toUpperCase() : '👤'}
              </span>
              <span className="hidden leading-tight lg:block">
                <span className="text-content block text-sm font-bold">
                  Hi{firstName ? `, ${firstName}` : ''}
                </span>
                <span className="text-muted block text-[11px] font-medium">Account</span>
              </span>
              <ChevronDownIcon className="text-muted hidden h-4 w-4 lg:block" />
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="bg-brand-600 hover:bg-brand-700 shadow-brand-200 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
