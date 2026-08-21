import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { Pagination } from '@/components/ui/Pagination'
import { UserRolesEditor } from '@/components/admin/UserRolesEditor'
import { listAdminUsers } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Admin · Customers',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type SP = { page?: string }

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const token = await requireServerToken('/admin/customers')
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let result
  try {
    result = await listAdminUsers(token, { page, page_size: 20 })
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/admin/customers')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader
        title="Users"
        description="All registered users (read-only). Roles live in the Supabase JWT, not here."
      />
      {result.items.length === 0 ? (
        <EmptyState title="No users yet" description="Users will appear here after sign-up." />
      ) : (
        <>
          <ul className="border-border bg-surface shadow-card divide-border space-y-0 divide-y rounded-2xl border">
            {result.items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-content font-semibold">{u.phone ?? u.email ?? u.id}</p>
                  <p className="text-muted text-xs">
                    {u.email ?? '—'} · joined {formatDateTime(u.created_at)}
                  </p>
                </div>
                <UserRolesEditor userId={u.id} />
              </li>
            ))}
          </ul>
          <Pagination data={result.pagination} base="/admin/customers" params={{}} />
        </>
      )}
    </Container>
  )
}
