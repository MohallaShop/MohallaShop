import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { ShopStatusActions } from '@/components/admin/ShopStatusActions'
import { listAdminShops } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Admin · Shops',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { q?: string; page?: string }

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/admin/shops')
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listAdminShops(token, { q, page, page_size: 20 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/shops')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Shops" description="Approve new registrations, suspend or close shops." />
      {result.items.length === 0 ? (
        <EmptyState title="No shops" description="No shops match this view." />
      ) : (
        <>
          <ul className="border-border bg-surface shadow-card divide-border divide-y rounded-2xl border">
            {result.items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-content flex min-w-0 flex-wrap items-center gap-2 font-semibold">
                    {s.name}
                    <ShopStatusBadge status={s.status} />
                  </p>
                  <p className="text-muted text-xs">
                    {s.city ?? '—'} · {s.product_count} products
                  </p>
                </div>
                <ShopStatusActions shopId={s.id} status={s.status} />
              </li>
            ))}
          </ul>
          <Pagination data={result.pagination} base="/admin/shops" params={{ q }} />
        </>
      )}
    </Container>
  )
}

function ShopStatusBadge({ status }: { status: string }) {
  if (status === 'pending') return <Badge tone="warning">pending approval</Badge>
  if (status === 'suspended') return <Badge tone="danger">suspended</Badge>
  if (status === 'active') return <Badge tone="success">active</Badge>
  return <Badge tone="muted">{status}</Badge>
}
