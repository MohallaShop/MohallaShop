import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { listAdminRiders } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Admin · Riders',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { page?: string }

export default async function AdminRidersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/admin/riders')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listAdminRiders(token, { page, page_size: 20 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/riders')
    return <ErrorState error={err} />
  }

  const totalActive = result.items.reduce((sum, r) => sum + r.active_deliveries, 0)

  return (
    <Container>
      <PageHeader
        title="Riders"
        description="Delivery partners on the platform and their live workload."
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="No riders yet"
          description="Riders appear here once they sign in and go online for the first time."
        />
      ) : (
        <>
          <ul className="border-border bg-surface shadow-card divide-border space-y-0 divide-y rounded-2xl border">
            {result.items.map((r) => (
              <li key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-content flex items-center gap-2 font-semibold">
                    {r.display_name ?? r.email ?? r.user_id}
                    <Badge tone={r.is_online ? 'success' : 'muted'}>
                      {r.is_online ? 'online' : 'offline'}
                    </Badge>
                  </p>
                  <p className="text-muted text-xs">
                    {r.email ?? '—'} · {r.completed_deliveries} completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-content text-sm font-semibold">{r.active_deliveries} active</p>
                  <p className="text-muted text-xs">now</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted mt-4 text-sm">
            {result.items.length} rider{result.items.length === 1 ? '' : 's'} on the platform ·{' '}
            {totalActive} active delivery{totalActive === 1 ? '' : 's'} in flight.
          </p>
          <Pagination data={result.pagination} base="/admin/riders" params={{}} />
        </>
      )}
    </Container>
  )
}
