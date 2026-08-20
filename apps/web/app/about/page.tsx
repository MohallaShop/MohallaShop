import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { siteConfig } from '@/lib/config/site'

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How MohallaShop connects customers, local shops and riders.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <main>
      <Container className="py-12 md:py-16">
        <h1 className="text-content text-3xl font-bold md:text-4xl">How {siteConfig.name} works</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Three simple sides working together to keep your neighbourhood stocked.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              t: 'Customers',
              d: 'Browse nearby shops, add items to cart, and place an order in minutes.',
            },
            {
              t: 'Shopkeepers',
              d: 'Receive orders instantly, accept, prepare, and mark ready for pickup.',
            },
            { t: 'Riders', d: 'Get matched to nearby deliveries, pick up, and drop off fast.' },
          ].map((c) => (
            <div key={c.t} className="border-border bg-surface shadow-card rounded-2xl border p-6">
              <h2 className="text-content text-lg font-semibold">{c.t}</h2>
              <p className="text-muted mt-1 text-sm">{c.d}</p>
            </div>
          ))}
        </div>
      </Container>
    </main>
  )
}
