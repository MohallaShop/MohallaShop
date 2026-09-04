import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import {
  BarChartIcon,
  BikeIcon,
  GridIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
} from '@/components/icons'
import { getAdminDashboard } from '@/lib/api/admin'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Admin dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

const MANAGEMENT_LINKS = [
  {
    title: 'Shops',
    description: 'Approve registrations, suspend shops, reopen or close shop accounts.',
    href: '/admin/shops',
    icon: StoreIcon,
    badge: 'Lifecycle controls',
  },
  {
    title: 'Products',
    description: 'Review catalog inventory, pricing, stock, and product visibility.',
    href: '/admin/products',
    icon: GridIcon,
    badge: 'Catalog oversight',
  },
  {
    title: 'Users',
    description: 'Inspect users and manage customer, partner, rider, and admin roles.',
    href: '/admin/customers',
    icon: UsersIcon,
    badge: 'Role controls',
  },
  {
    title: 'Orders',
    description: 'Monitor order volume and status across the platform.',
    href: '/admin/orders',
    icon: ReceiptIcon,
    badge: 'Order oversight',
  },
  {
    title: 'Riders',
    description: 'Track rider availability, active deliveries, and completed deliveries.',
    href: '/admin/riders',
    icon: BikeIcon,
    badge: 'Delivery network',
  },
  {
    title: 'Analytics',
    description: 'Review order trends, revenue, top shops, and live rider counts.',
    href: '/admin/analytics',
    icon: BarChartIcon,
    badge: 'Platform activity',
  },
  {
    title: 'Settings',
    description: 'Check operational flags such as payments, Supabase admin, and rider fees.',
    href: '/admin/settings',
    icon: SettingsIcon,
    badge: 'Configuration',
  },
]

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
        title="Admin control center"
        description="Separate platform operations for shops, catalog, users, orders, riders, analytics, and settings."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border-border bg-surface shadow-card hover:shadow-card-hover rounded-lg border p-4 transition"
          >
            <p className="text-muted text-sm font-semibold">{card.label}</p>
            <p className="text-content mt-1 text-2xl font-extrabold">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-lg font-bold">Management</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MANAGEMENT_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="border-border bg-surface shadow-card hover:shadow-card-hover flex min-w-0 gap-3 rounded-lg border p-4 transition"
              >
                <span className="bg-brand-500/10 text-brand-700 dark:text-brand-300 grid h-11 w-11 shrink-0 place-items-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="text-content block font-bold">{item.title}</span>
                  <span className="text-muted mt-1 block text-sm leading-5">
                    {item.description}
                  </span>
                  <Badge tone="muted" className="mt-3">
                    {item.badge}
                  </Badge>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-content mb-3 text-lg font-bold">Orders by status</h2>
        {statusEntries.length === 0 ? (
          <EmptyState title="No orders yet" description="Order counts will appear here." />
        ) : (
          <ul className="border-border bg-surface shadow-card divide-border divide-y rounded-lg border">
            {statusEntries.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between gap-4 p-4">
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
