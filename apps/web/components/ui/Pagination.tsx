import Link from 'next/link'
import type { Pagination as PaginationData } from '@/lib/api/types'

function buildHref(
  base: string,
  params: Record<string, string | number | undefined>,
  page: number,
) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, page })) {
    if (v !== undefined && v !== null && String(v) !== '') search.set(k, String(v))
  }
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

export function Pagination({
  data,
  base,
  params = {},
}: {
  data: PaginationData
  base: string
  params?: Record<string, string | number | undefined>
}) {
  if (data.total_pages <= 1) return null
  const { page, total_pages } = data
  const prev = Math.max(1, page - 1)
  const next = Math.min(total_pages, page + 1)

  return (
    <nav
      aria-label="Pagination"
      className="text-muted mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={buildHref(base, params, prev)}
          className="border-border bg-surface hover:bg-surface-hover inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition"
        >
          ← Prev
        </Link>
      ) : (
        <span className="border-border inline-flex h-9 cursor-not-allowed items-center rounded-lg border px-3 text-sm opacity-40">
          ← Prev
        </span>
      )}
      <span className="text-sm" aria-current="page">
        Page <span className="text-content font-semibold">{page}</span> of {total_pages}
      </span>
      {page < total_pages ? (
        <Link
          href={buildHref(base, params, next)}
          className="border-border bg-surface hover:bg-surface-hover inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition"
        >
          Next →
        </Link>
      ) : (
        <span className="border-border inline-flex h-9 cursor-not-allowed items-center rounded-lg border px-3 text-sm opacity-40">
          Next →
        </span>
      )}
    </nav>
  )
}
