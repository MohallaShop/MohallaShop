import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { getAdminAnalytics } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Admin · Analytics',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const token = await requireServerToken('/admin/analytics')

  let data
  try {
    data = await getAdminAnalytics(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/analytics')
    return <ErrorState error={err} />
  }

  const totalOrders = data.orders_per_day.reduce((sum, d) => sum + d.orders, 0)
  const totalRevenue = data.orders_per_day.reduce((sum, d) => sum + Number(d.revenue), 0)
  const maxOrders = Math.max(1, ...data.orders_per_day.map((d) => d.orders))
  const hasData = totalOrders > 0

  return (
    <Container>
      <PageHeader title="Analytics" description="Orders and revenue over the last 14 days." />

      {!hasData ? (
        <EmptyState title="No orders yet" description="Charts fill in as customers place orders." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Orders (14d)" value={String(totalOrders)} />
            <Stat label="Revenue (14d)" value={formatMoney(String(totalRevenue.toFixed(2)))} />
            <Stat
              label="Best day"
              value={String(Math.max(...data.orders_per_day.map((d) => d.orders)))}
            />
            <Stat label="Avg / day" value={(totalOrders / data.orders_per_day.length).toFixed(1)} />
          </div>

          <section className="border-border bg-surface shadow-card mb-6 rounded-2xl border p-5">
            <h2 className="text-content mb-4 text-sm font-semibold">Orders per day</h2>
            {/* CSS bar chart — heights are proportional to each day's orders. */}
            <div className="flex h-40 items-end gap-1.5 sm:gap-2">
              {data.orders_per_day.map((d) => (
                <div key={d.date} className="group flex h-full flex-1 flex-col justify-end">
                  <div
                    className="bg-brand-500 group-hover:bg-brand-600 w-full rounded-t-md transition-colors"
                    style={{ height: `${Math.max(4, (d.orders / maxOrders) * 100)}%` }}
                    title={`${d.date}: ${d.orders} orders · ${formatMoney(d.revenue)}`}
                  />
                  <span className="text-muted mt-1 hidden text-center text-[10px] sm:block">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="border-border bg-surface shadow-card rounded-2xl border p-5">
            <h2 className="text-content mb-4 text-sm font-semibold">Top shops by revenue</h2>
            <ul className="divide-border divide-y">
              {data.top_shops.map((s, i) => (
                <li key={s.shop_id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-content flex items-center gap-3 text-sm font-medium">
                    <span className="bg-brand-100 text-brand-700 grid h-6 w-6 place-items-center rounded-full text-xs font-bold">
                      {i + 1}
                    </span>
                    {s.shop_name}
                  </span>
                  <span className="text-muted text-sm">
                    {s.orders} orders ·{' '}
                    <strong className="text-content">{formatMoney(s.revenue)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Container>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-surface shadow-card rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-content mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
