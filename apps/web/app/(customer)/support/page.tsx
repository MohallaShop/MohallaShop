import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { siteConfig } from '@/lib/config/site'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with orders, payments, deliveries and your MohallaShop account.',
  alternates: { canonical: '/support' },
}

const FAQS = [
  {
    q: 'How do I place an order?',
    a: 'Browse shops from the home page, open a shop, add items to your cart and tap "Proceed to checkout". You will sign in at checkout, pick a delivery address, and confirm the order.',
  },
  {
    q: 'Which payment methods can I use?',
    a: 'This MVP currently supports cash on delivery. Online payments are intentionally not shown at checkout until the provider flow is added.',
  },
  {
    q: 'How do I track my order?',
    a: 'Open "Orders" from the menu — every order shows its live status from the shop accepting it right through to delivery at your door.',
  },
  {
    q: 'Can I cancel an order?',
    a: 'Yes — you can cancel from the order page while the shop has not yet accepted it. Once the shop starts preparing, cancellation is no longer possible.',
  },
  {
    q: 'Something was wrong with my delivery. What now?',
    a: 'Contact support below with your order number. The support team can review the issue with the shop.',
  },
  {
    q: 'How do I sell on MohallaShop?',
    a: 'Sign in as a shopkeeper, register your shop from the shop dashboard, and wait for admin approval. Once approved, you can add products and receive orders.',
  },
]

export default function SupportPage() {
  return (
    <main>
      <Container className="py-10 md:py-14">
        <h1 className="text-content text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Answers to common questions, plus how to reach us about an order or your account.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="border-border bg-surface shadow-card rounded-2xl border p-6">
            <h2 className="text-content text-base font-semibold">Track an order</h2>
            <p className="text-muted mt-1 text-sm">
              See live status for every order you have placed.
            </p>
            <Link
              href="/orders"
              className="text-brand-700 hover:text-brand-800 mt-3 inline-block text-sm font-semibold"
            >
              Go to your orders →
            </Link>
          </div>
          <div className="border-border bg-surface shadow-card rounded-2xl border p-6">
            <h2 className="text-content text-base font-semibold">Email us</h2>
            <p className="text-muted mt-1 text-sm">
              Write to <span className="text-content font-medium">support@mohallashop.in</span> — we
              reply within one working day.
            </p>
          </div>
          <div className="border-border bg-surface shadow-card rounded-2xl border p-6">
            <h2 className="text-content text-base font-semibold">Order issues</h2>
            <p className="text-muted mt-1 text-sm">
              Include your order number (like MS-XXXXXX) for the fastest help with missing or
              damaged items.
            </p>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-content text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="border-border bg-surface shadow-card group rounded-2xl border p-5"
              >
                <summary className="text-content cursor-pointer list-none text-base font-semibold marker:hidden">
                  <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
                  {f.q}
                </summary>
                <p className="text-muted mt-3 pl-6 text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="text-muted mt-12 text-sm">
          {siteConfig.name} · neighbourhood commerce, made simple.
        </p>
      </Container>
    </main>
  )
}
