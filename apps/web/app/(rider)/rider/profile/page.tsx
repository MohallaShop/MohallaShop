import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ProfileForm } from '@/components/customer/ProfileForm'
import { Badge } from '@/components/ui/Badge'
import { getProfile } from '@/lib/api/profile'
import { requireServerAuth, requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export default async function RiderProfilePage() {
  const auth = await requireServerAuth('/rider/profile')
  const token = await requireServerToken('/rider/profile')
  let profile
  try {
    profile = await getProfile(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/rider/profile')
    return <ErrorState error={err} />
  }

  const hasRiderRole = auth.roles.includes('rider')

  return (
    <Container>
      <PageHeader title="Rider profile" description="Your account and rider details.">
        <SignOutButton />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border-border bg-surface shadow-card rounded-2xl border p-5 lg:col-span-2">
          <h2 className="text-content text-lg font-semibold">Account details</h2>
          <p className="text-muted mt-1 text-sm">
            Shops and customers see this name when you pick up and drop off orders.
          </p>
          <div className="mt-4">
            <ProfileForm profile={profile} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="border-border bg-surface shadow-card rounded-2xl border p-5">
            <h2 className="text-content text-sm font-semibold">Rider status</h2>
            <p className="text-muted mt-1 text-xs">
              Your platform roles come from your verified account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {auth.roles.map((role) => (
                <Badge key={role} tone={role === 'rider' ? 'success' : 'muted'}>
                  {role.replace(/_/g, ' ')}
                </Badge>
              ))}
              {!hasRiderRole ? (
                <p className="text-warning mt-1 w-full text-xs">
                  You are signed in but do not hold the rider role yet — request it from an admin.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
