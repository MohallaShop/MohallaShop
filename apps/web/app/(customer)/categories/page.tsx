import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { CategoryCard } from '@/components/customer/ProductSearchCard'
import { listCategorySummary } from '@/lib/api/shops'
import { getServerAuth } from '@/lib/api/session'

export const metadata: Metadata = {
  title: 'Categories',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  // Guest-browsable catalogue page (ADR-0006).
  const token = (await getServerAuth())?.token ?? null

  let categories
  try {
    categories = await listCategorySummary(token)
  } catch (err) {
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader
        title="Categories"
        description="Browse products by category across all local shops."
      />
      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories will appear here once shops list products."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              href={`/search?category=${encodeURIComponent(c.id)}`}
            />
          ))}
        </div>
      )}
    </Container>
  )
}
