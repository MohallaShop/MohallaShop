import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { getRiderEarnings } from '@/lib/api/rider'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatDate, formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Rider earnings',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function RiderEarningsPage() {
  const token = await requireServerToken('/rider/earnings')
  let earnings
  try {
    earnings = await getRiderEarnings(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/rider/earnings')
    return <ErrorState error={err} />
  }

  const summary = [
    { label: 'Lifetime deliveries', value: String(earnings.lifetime_deliveries) },
    { label: 'Lifetime fees', value: formatMoney(earnings.lifetime_fees) },
    { label: "Today's fees", value: formatMoney(earnings.today_fees) },
  ]

  const hasActivity = earnings.lifetime_deliveries > 0

  return (
    <Container>
      <PageHeader
        title="Earnings"
        description="Fees from completed deliveries. Per-order fees are set by the platform and snapshotted at assignment."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <div
            key={s.label}
            className="border-border bg-surface shadow-card rounded-2xl border p-5"
          >
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-content mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-lg font-semibold">Last 7 days</h2>
        {!hasActivity ? (
          <EmptyState
            title="No deliveries yet"
            description="Your daily earnings will appear here after you complete deliveries."
          />
        ) : (
          <div className="border-border bg-surface shadow-card overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted text-left text-xs uppercase tracking-wide">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Day
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Deliveries
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Fees
                  </th>
                </tr>
              </thead>
              <tbody>
                {earnings.per_day.map((day) => (
                  <tr key={day.date} className="border-border border-t">
                    <td className="px-4 py-3">{formatDate(day.date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{day.deliveries}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(day.fees)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  )
}
