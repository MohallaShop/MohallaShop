'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function SearchBar({
  placeholder = 'Search shops or products…',
  basePath = '/search',
  defaultValue,
  autoFocus,
}: {
  placeholder?: string
  basePath?: string
  defaultValue?: string
  autoFocus?: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(defaultValue ?? params.get('q') ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    const url = term ? `${basePath}?q=${encodeURIComponent(term)}` : basePath
    router.push(url)
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <svg
          className="text-muted pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search"
          className="border-border bg-surface text-content focus:border-brand-500 block w-full rounded-full border py-2.5 pl-10 pr-4 outline-none"
        />
      </div>
      <button
        type="submit"
        className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white"
      >
        Search
      </button>
    </form>
  )
}
