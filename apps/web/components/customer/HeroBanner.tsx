import Link from 'next/link'
import { PlayIcon, ZapIcon } from '@/components/icons'

/**
 * Hero banner for the customer home — gradient panel with the core value
 * proposition, primary CTAs and a lightweight CSS/emoji illustration
 * (swap for real artwork when brand assets land).
 */
export function HeroBanner() {
  return (
    <section className="from-brand-100 via-brand-50 relative overflow-hidden rounded-3xl bg-gradient-to-br to-rose-50 p-6 md:p-8">
      <div className="relative z-10 max-w-md">
        <h1 className="text-content text-2xl font-extrabold leading-tight md:text-4xl">
          Your Neighbourhood.
          <br />
          Your Store. <span className="text-brand-600">Delivered.</span>
        </h1>
        <p className="text-content/70 mt-3 text-sm md:text-base">
          Order from local shops near you and get them delivered to your door.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/shops"
            className="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          >
            Shop Near Me
          </Link>
          <Link
            href="/about"
            className="border-border bg-surface text-content hover:border-brand-300 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
          >
            <PlayIcon className="text-brand-600 h-5 w-5" />
            How It Works
          </Link>
        </div>
        <p className="text-muted mt-4 flex items-center gap-1.5 text-xs">
          <span aria-hidden="true">🏪</span> Supporting local shops near you
        </p>
      </div>

      {/* Illustration */}
      <div className="pointer-events-none absolute -right-4 bottom-0 top-0 hidden w-80 sm:block lg:right-6" aria-hidden="true">
        <div className="border-brand-200 bg-surface absolute right-16 top-6 h-56 w-32 rotate-6 rounded-2xl border-4 shadow-lg">
          <div className="bg-brand-50 m-2 h-24 rounded-xl">
            <svg viewBox="0 0 100 80" className="h-full w-full">
              <path d="M10 65 C 30 55, 40 35, 55 30 S 85 20, 90 10" fill="none" stroke="var(--color-brand-500)" strokeWidth="3" strokeDasharray="5 4" />
              <circle cx="90" cy="10" r="5" fill="var(--color-brand-600)" />
              <circle cx="10" cy="65" r="4" fill="var(--color-brand-300)" />
            </svg>
          </div>
          <div className="text-brand-600 mt-1 text-center text-4xl">🛵</div>
        </div>
        <div className="bg-surface shadow-elevated absolute right-2 top-14 flex items-center gap-2 rounded-2xl px-3 py-2">
          <span className="bg-brand-100 text-brand-600 grid h-7 w-7 place-items-center rounded-full">
            <ZapIcon className="h-4 w-4" />
          </span>
          <span className="text-content text-xs font-bold leading-tight">
            Local
            <br />
            <span className="text-muted font-medium">shops, online</span>
          </span>
        </div>
      </div>
    </section>
  )
}
