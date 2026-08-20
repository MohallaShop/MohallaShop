import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { PageHeader, ErrorState } from '@/components/ui/StateFeedback'
import { CartManager } from '@/components/customer/CartManager'
import { getCart } from '@/lib/api/cart'
import { requireServerToken } from '@/lib/api/session'
import { isAuthError } from '@/lib/api/errors'

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const token = await requireServerToken('/cart')
  let cart
  try {
    cart = await getCart(token)
  } catch (err) {
    if (isAuthError(err)) redirect('/login?next=/cart')
    return <ErrorState error={err} />
  }

  return (
    <Container>
      <PageHeader title="Your cart" description="All items are from a single shop." />
      <CartManager initial={cart} />
    </Container>
  )
}
