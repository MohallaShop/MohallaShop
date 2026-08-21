import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { DeliveryCard } from '@/components/rider/DeliveryCard'
import { listRiderDeliveries } from '@/lib/api/rider'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Rider deliveries',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const FILTERS = [
  { label: 'All' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Picked up', value: 'picked_up' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
]

type SP = { page?: string; status?: string }

export default async function RiderDeliveriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/rider/deliveries')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const status = sp.status

  let result
  try {
    result = await listRiderDeliveries(token, { status, page, page_size: 15 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/rider/deliveries')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader
        title="Deliveries"
        description="Pickups assigned to you and their current state."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? undefined) === f.value
          const href = f.value ? `/rider/deliveries?status=${f.value}` : '/rider/deliveries'
          return (
            <Link
              key={f.label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border bg-surface text-muted hover:bg-brand-50 hover:text-content'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No deliveries here"
          description={
            status
              ? 'Try a different status filter.'
              : 'Your deliveries will appear here once shops mark orders ready.'
          }
        />
      ) : (
        <>
          <ul className="space-y-4">
            {result.items.map((d) => (
              <DeliveryCard key={d.id} delivery={d} />
            ))}
          </ul>
          <Pagination data={result.pagination} base="/rider/deliveries" params={{ status }} />
        </>
      )}
    </Container>
  )
}
