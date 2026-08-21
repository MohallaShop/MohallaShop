import Link from 'next/link'
import { PlayIcon, ClockIcon, ShieldIcon } from '@/components/icons'

/**
 * Premium hero banner — vibrant gradient panel with delivery speed badge,
 * illustrated scooter route, and quick CTAs. Seamlessly high-contrast in both modes.
 */
export function HeroBanner() {
  return (
    <section className="from-brand-600 via-brand-700 shadow-elevated relative overflow-hidden rounded-3xl bg-gradient-to-br to-indigo-800 p-5 md:p-7 lg:p-9">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 0 400 200">
          <defs>
            <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="400" height="200" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="max-w-lg flex-1">
          <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
            Your Neighbourhood.
            <br />
            Your Store.{' '}
            <span className="from-accent-300 to-accent-400 bg-gradient-to-r bg-clip-text text-transparent">
              Delivered.
            </span>
          </h1>
          <p className="mt-2.5 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
            Order from trusted local shops near you and get doorstep delivery in 15–30 minutes.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/shops"
              className="text-brand-700 dark:text-brand-900 hover:bg-brand-50 dark:hover:bg-brand-100 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold shadow-md transition hover:shadow-lg sm:px-6 sm:py-3"
            >
              Shop Near Me
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:px-5 sm:py-3"
            >
              <PlayIcon className="h-4 w-4" />
              How It Works
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-white/80 sm:text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Supporting 500+ local shops
            </span>
          </div>
        </div>

        {/* Right side illustration */}
        <div className="pointer-events-none hidden shrink-0 lg:block" aria-hidden="true">
          <div className="relative">
            {/* Phone mockup */}
            <div className="relative h-48 w-32 rotate-3 rounded-3xl border-2 border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm">
              <div className="bg-brand-500/30 dark:bg-brand-500/20 m-2.5 h-24 rounded-2xl">
                <svg viewBox="0 0 100 80" className="h-full w-full opacity-60">
                  <path
                    d="M10 65 C 30 55, 40 35, 55 30 S 85 20, 90 10"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                  <circle cx="90" cy="10" r="4" fill="white" opacity="0.9" />
                  <circle cx="10" cy="65" r="3" fill="white" opacity="0.6" />
                </svg>
              </div>
              <div className="mt-1 text-center text-2xl">🛵</div>
            </div>

            {/* Delivery speed badge */}
            <div className="border-border/50 bg-surface/95 text-content shadow-elevated absolute -right-4 top-3 flex items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-md">
              <span className="bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 grid h-7 w-7 place-items-center rounded-full">
                <ClockIcon className="h-4 w-4" />
              </span>
              <div className="text-content text-xs font-bold leading-tight">
                15–30 min
                <br />
                <span className="text-muted text-[11px] font-normal">delivery</span>
              </div>
            </div>

            {/* Support badge */}
            <div className="border-border/50 bg-surface/95 text-content shadow-elevated absolute -bottom-2 left-2 flex items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-md">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <ShieldIcon className="h-4 w-4" />
              </span>
              <div className="text-content text-xs font-bold leading-tight">
                Verified
                <br />
                <span className="text-muted text-[11px] font-normal">local shops</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
