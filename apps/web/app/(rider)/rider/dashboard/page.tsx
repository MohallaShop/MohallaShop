import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { RiderStatusCard } from '@/components/rider/RiderStatusCard'
import { getRiderDashboard } from '@/lib/api/rider'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Rider dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function RiderDashboardPage() {
  const token = await requireServerToken('/rider/dashboard')
  let dashboard
  try {
    dashboard = await getRiderDashboard(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/rider/dashboard')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Rider dashboard" description="Your availability and today's activity." />

      <div className="grid gap-4 lg:grid-cols-3">
        <RiderStatusCard isOnline={dashboard.is_online} activeDeliveries={dashboard.active_count} />

        <div className="border-border bg-surface shadow-card rounded-2xl border p-6 lg:col-span-2">
          <h2 className="text-content text-lg font-semibold">Today</h2>
          <p className="text-muted mt-1 text-sm">
            Completed deliveries and fees earned while online.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                Active deliveries
              </p>
              <p className="text-content mt-1 text-2xl font-bold">{dashboard.active_count}</p>
            </div>
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                Completed today
              </p>
              <p className="text-content mt-1 text-2xl font-bold">{dashboard.completed_today}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                Earned today
              </p>
              <p className="text-success mt-1 text-2xl font-bold">
                {formatMoney(dashboard.earned_today)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
