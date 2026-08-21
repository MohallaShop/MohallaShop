import Link from 'next/link'
import { Container } from '@/components/layout/Container'

const valueProps = [
  {
    title: 'For shoppers',
    desc: 'Discover nearby shops, order daily essentials and track your delivery — from the people you know.',
    cta: 'Start shopping',
    // Browsing is open to everyone; login is only asked at purchase (ADR-0006).
    href: '/home',
    tone: 'brand' as const,
  },
  {
    title: 'For shopkeepers',
    desc: 'Put your shop online, manage products and handle incoming orders from your neighbourhood.',
    cta: 'Manage your shop',
    href: '/login?role=shopkeeper',
    tone: 'accent' as const,
  },
  {
    title: 'For riders',
    desc: 'Go online, accept deliveries and earn with flexible hours in your own area.',
    cta: 'Become a rider',
    href: '/login?role=rider',
    tone: 'muted' as const,
  },
]

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="from-brand-50 to-background bg-gradient-to-b">
        <Container className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-content text-4xl font-bold tracking-tight md:text-6xl">
              Your neighbourhood, <span className="text-brand-600">delivered.</span>
            </h1>
            <p className="text-muted mt-5 text-lg md:text-xl">
              Shop local. Order easy. Daily essentials from trusted shops near you — fair prices and
              fast delivery.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/home"
                className="bg-brand-600 shadow-card hover:bg-brand-700 inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-base font-semibold text-white transition sm:w-auto"
              >
                Start shopping
              </Link>
              <Link
                href="/about"
                className="border-border bg-surface text-content hover:bg-brand-50 inline-flex h-12 w-full items-center justify-center rounded-xl border px-6 text-base font-semibold transition sm:w-auto"
              >
                How it works
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="border-border bg-surface border-y">
        <Container className="py-12 md:py-16">
          <h2 className="text-content text-2xl font-bold md:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Choose your shop',
                desc: 'Browse shops in your area and add items to your cart.',
              },
              {
                step: '2',
                title: 'Order in seconds',
                desc: 'Checkout in a couple of taps and pay cash on delivery.',
              },
              {
                step: '3',
                title: 'Get it delivered',
                desc: 'Track your order from the shop to your door.',
              },
            ].map((s) => (
              <div key={s.step} className="border-border bg-background rounded-2xl border p-6">
                <span className="bg-brand-600 grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white">
                  {s.step}
                </span>
                <h3 className="text-content mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="text-muted mt-1 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Who it's for */}
      <section>
        <Container className="py-12 md:py-16">
          <h2 className="text-content text-2xl font-bold md:text-3xl">
            One platform, for your whole neighbourhood
          </h2>
          <p className="text-muted mt-2 max-w-2xl">
            Customers, shopkeepers and riders each get a tailored experience — all from one
            responsive platform.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {valueProps.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="border-border bg-surface shadow-card hover:shadow-elevated group flex flex-col rounded-2xl border p-6 transition hover:-translate-y-0.5"
              >
                <h3 className="text-content text-lg font-semibold">{s.title}</h3>
                <p className="text-muted mt-1 flex-1 text-sm">{s.desc}</p>
                <span className="text-brand-700 group-hover:text-brand-800 mt-4 text-sm font-semibold">
                  {s.cta} →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </main>
  )
}
