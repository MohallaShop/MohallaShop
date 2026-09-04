import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { Badge } from '@/components/ui/Badge'
import { listAdminProducts } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Admin · Products',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { q?: string; page?: string }

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/admin/products')
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listAdminProducts(token, { q, page, page_size: 20 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/products')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Products" description="All products across shops (read-only)." />
      {result.items.length === 0 ? (
        <EmptyState title="No products" description="No products match this view." />
      ) : (
        <>
          <ul className="border-border bg-surface shadow-card divide-border divide-y rounded-2xl border">
            {result.items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-content truncate font-semibold">{p.name}</p>
                  <p className="text-muted text-xs">
                    {formatMoney(p.price)} · {p.unit} · stock {p.quantity_available}
                  </p>
                </div>
                <Badge tone={p.is_active ? 'success' : 'muted'}>
                  {p.is_active ? 'Active' : 'Hidden'}
                </Badge>
              </li>
            ))}
          </ul>
          <Pagination data={result.pagination} base="/admin/products" params={{ q }} />
        </>
      )}
    </Container>
  )
}
