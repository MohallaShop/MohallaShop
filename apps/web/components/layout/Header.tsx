'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  BellIcon,
  ChevronDownIcon,
  HelpCircleIcon,
  MapPinIcon,
  SearchIcon,
  SparklesIcon,
} from '@/components/icons'

/**
 * Desktop top bar for the customer shell (hidden on mobile, where the compact
 * brand bar + bottom nav take over). Location and display name are resolved
 * server-side and passed in as plain props.
 */
export function Header({
  userName,
  location,
  notificationCount = 0,
}: {
  userName?: string | null
  location?: string | null
  notificationCount?: number
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const firstName = userName?.trim().split(/\s+/)[0] ?? null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <header className="border-border bg-background/80 sticky top-0 z-20 hidden h-16 items-center gap-6 border-b px-6 backdrop-blur md:flex">
      <Link
        href="/profile"
        className="hover:bg-surface flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 transition"
      >
        <MapPinIcon className="text-brand-600 h-5 w-5" />
        <span className="leading-tight">
          <span className="text-muted block text-[11px]">Deliver to</span>
          <span className="text-content flex items-center gap-1 text-sm font-semibold">
            {location ?? 'Set your location'}
            <ChevronDownIcon className="text-muted h-4 w-4" />
          </span>
        </span>
      </Link>

      <form onSubmit={submit} role="search" className="flex flex-1 justify-center">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="text-muted pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for anything (milk, apple, medicine…)"
            aria-label="Search"
            className="border-border bg-surface text-content focus:border-brand-400 block w-full rounded-full border py-2.5 pl-11 pr-24 text-sm shadow-sm outline-none"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <SparklesIcon className="text-brand-400 hidden h-5 w-5 lg:block" />
            <button
              type="submit"
              aria-label="Search"
              className="bg-brand-600 hover:bg-brand-700 grid h-9 w-9 place-items-center rounded-xl text-white transition"
            >
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-4">
        <Link
          href="/support"
          className="text-content/80 hover:text-content flex items-center gap-1.5 text-sm font-medium transition"
        >
          <HelpCircleIcon className="h-5 w-5" />
          <span className="hidden lg:inline">Help</span>
        </Link>

        <Link
          href="/orders"
          aria-label="Notifications"
          className="text-content/80 hover:text-content relative transition"
        >
          <BellIcon className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span className="bg-brand-600 absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          ) : null}
        </Link>

        <Link href="/profile" className="flex items-center gap-2.5">
          <span className="bg-brand-100 text-brand-700 grid h-9 w-9 place-items-center rounded-full text-sm font-bold">
            {firstName ? firstName.charAt(0).toUpperCase() : '👤'}
          </span>
          <span className="hidden leading-tight lg:block">
            <span className="text-content block text-sm font-semibold">
              Hi{firstName ? `, ${firstName}` : ''}
            </span>
            <span className="text-muted block text-[11px] font-medium">Account</span>
          </span>
          <ChevronDownIcon className="text-muted hidden h-4 w-4 lg:block" />
        </Link>
      </div>
    </header>
  )
}
