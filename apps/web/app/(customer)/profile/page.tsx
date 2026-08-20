import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { ProfileForm } from '@/components/customer/ProfileForm'
import { AddressManager } from '@/components/customer/AddressManager'
import { LinkCard } from '@/components/customer/LinkCard'
import { getProfile, listAddresses } from '@/lib/api/profile'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const token = await requireServerToken('/profile')
  let profile, addresses
  try {
    ;[profile, addresses] = await Promise.all([
      getProfile(token),
      listAddresses(token).then((r) => r.items),
    ])
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/profile')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Your profile" description="Manage your details, addresses and account.">
        <SignOutButton />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border-border bg-surface shadow-card rounded-2xl border p-5 lg:col-span-2">
          <h2 className="text-content text-lg font-semibold">Account details</h2>
          <p className="text-muted mt-1 text-sm">
            This information helps shops and riders reach you.
          </p>
          <div className="mt-4">
            <ProfileForm profile={profile} />
          </div>
        </section>

        <section className="space-y-4">
          <LinkCard
            href="/orders"
            title="Your orders"
            description="Track and manage past orders."
          />
          <LinkCard href="/cart" title="Your cart" description="Review items before checkout." />
        </section>
      </div>

      <section className="mt-6">
        <AddressManager addresses={addresses} />
      </section>
    </Container>
  )
}
