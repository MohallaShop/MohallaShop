import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { Badge } from '@/components/ui/Badge'
import { getAdminSettings } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatMoney } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Admin · Settings',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const token = await requireServerToken('/admin/settings')

  let settings
  try {
    settings = await getAdminSettings(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/settings')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader
        title="Settings"
        description="Operational flags. Values are configured through environment variables on the backend — nothing here is editable in-app."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FlagCard
          title="Online payments (Razorpay)"
          enabled={settings.payments_enabled}
          on={<>Checkout offers “UPI, Cards &amp; Wallets” alongside cash on delivery.</>}
          off={
            settings.razorpay_configured ? (
              <>Credentials present but payments are disabled server-side.</>
            ) : (
              <>
                Checkout is cash-on-delivery only. Set <code>RAZORPAY_KEY_ID</code> and{' '}
                <code>RAZORPAY_KEY_SECRET</code> on the backend to enable online payments.
                <code>RAZORPAY_WEBHOOK_SECRET</code> is optional but recommended.
              </>
            )
          }
        />
        <FlagCard
          title="User role management (Supabase Admin API)"
          enabled={settings.supabase_admin_configured}
          on={<>Admins can view users and change their roles from the Users screen.</>}
          off={
            <>
              The “Manage roles” tool on the Users screen is unavailable. Set{' '}
              <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> on the backend to
              enable it. Keep the service-role key server-side only.
            </>
          }
        />
        <FlagCard
          title="Rider delivery fee"
          enabled
          on={<>Flat fee credited to a rider per completed delivery.</>}
          off={null}
        >
          <p className="text-content mt-2 text-base font-bold">
            {formatMoney(settings.rider_delivery_fee)} per delivery
          </p>
        </FlagCard>
      </div>

      <p className="text-muted mt-6 text-xs">
        Flags are read-only by design — changing them means updating the backend environment and
        restarting the service. Secrets are never sent to the browser.
      </p>
    </Container>
  )
}

function FlagCard({
  title,
  enabled,
  on,
  off,
  children,
}: {
  title: string
  enabled: boolean
  on: React.ReactNode
  off: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="border-border bg-surface shadow-card rounded-2xl border p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-content text-sm font-semibold">{title}</h2>
        <Badge tone={enabled ? 'success' : 'muted'}>{enabled ? 'enabled' : 'disabled'}</Badge>
      </div>
      <div className="text-muted text-sm">{enabled ? on : off}</div>
      {children}
    </div>
  )
}
