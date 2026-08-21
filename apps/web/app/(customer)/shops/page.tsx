import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { ShopCard } from '@/components/customer/ShopCard'
import { SearchBar } from '@/components/customer/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { listShops } from '@/lib/api/shops'
import { getServerAuth } from '@/lib/api/session'

export const metadata: Metadata = {
  title: 'Shops',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { q?: string; page?: string; city?: string }

export default async function ShopsPage({ searchParams }: { searchParams: Promise<SP> }) {
  // Guest-browsable catalogue page (ADR-0006).
  const token = (await getServerAuth())?.token ?? null
  const sp = await searchParams
  const q = sp.q?.trim() || undefined
  const city = sp.city?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listShops(token, { q, city, page, page_size: 12 })
  } catch (err) {
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Shops near you" description="Browse trusted local shops.">
        <div className="hidden md:block" />
      </PageHeader>

      <div className="mb-6">
        <SearchBar defaultValue={q} basePath="/shops" />
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title={q ? `No shops match “${q}”` : 'No shops available yet'}
          description={
            q
              ? 'Try a different search term or clear the search.'
              : 'Shops in your neighbourhood will appear here once they go live.'
          }
          action={q ? { label: 'Clear search', href: '/shops' } : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
          <Pagination data={result.pagination} base="/shops" params={{ q, city }} />
        </>
      )}
    </Container>
  )
}
