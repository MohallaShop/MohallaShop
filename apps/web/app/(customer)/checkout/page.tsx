import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, EmptyState, ErrorState } from '@/components/ui/StateFeedback'
import { CheckoutForm } from '@/components/customer/CheckoutForm'
import { getCart } from '@/lib/api/cart'
import { listAddresses } from '@/lib/api/profile'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const token = await requireServerToken('/checkout')
  let cart, addresses
  try {
    ;[cart, addresses] = await Promise.all([
      getCart(token),
      listAddresses(token).then((r) => r.items),
    ])
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/checkout')
    return <ErrorState error={err} />
  }

  if (cart.items.length === 0) {
    return (
      <Container>
        <PageHeader title="Checkout" />
        <EmptyState
          title="Your cart is empty"
          description="Add items before checking out."
          action={{ label: 'Browse shops', href: '/shops' }}
        />
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader title="Checkout" description="Review your items and choose a delivery address." />
      <div className="mx-auto max-w-2xl">
        <CheckoutForm addresses={addresses} cart={cart} />
      </div>
    </Container>
  )
}
