import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { getAdminDashboard } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Admin dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const token = await requireServerToken('/admin/dashboard')
  let dashboard
  try {
    dashboard = await getAdminDashboard(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/dashboard')
    return <ErrorState error={err} />
  }

  const cards = [
    { label: 'Users', value: dashboard.users, href: '/admin/customers' },
    { label: 'Active shops', value: dashboard.shops_active, href: '/admin/shops' },
    { label: 'Inactive shops', value: dashboard.shops_inactive, href: '/admin/shops' },
    { label: 'Products', value: dashboard.products, href: '/admin/products' },
  ]

  const statusEntries = Object.entries(dashboard.orders_by_status)

  return (
    <Container>
      <PageHeader
        title="Admin dashboard"
        description="Platform oversight. Counts reflect real database state."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="border-border bg-surface shadow-card hover:shadow-elevated rounded-2xl border p-5 transition hover:-translate-y-0.5"
            >
              <p className="text-muted text-sm">{c.label}</p>
              <p className="text-content mt-1 text-2xl font-bold">{c.value}</p>
            </Link>
          ))}
        </div>
      </PageHeader>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-lg font-bold">Orders by status</h2>
        {statusEntries.length === 0 ? (
          <EmptyState title="No orders yet" description="Order counts will appear here." />
        ) : (
          <ul className="border-border bg-surface shadow-card divide-border divide-y rounded-2xl border">
            {statusEntries.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between p-4">
                <span className="text-content capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="text-content font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}
