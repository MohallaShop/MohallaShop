import Link from 'next/link'
import type { CategorySummary } from '@/lib/api/types'

/** Emoji + light/dark tint per category slug. */
const SLUG_STYLE: Record<string, { emoji: string; tint: string; ring: string }> = {
  groceries: {
    emoji: '🛍️',
    tint: 'bg-amber-500/10 dark:bg-amber-500/15',
    ring: 'ring-amber-500/25 dark:ring-amber-500/30',
  },
  'fruits-vegetables': {
    emoji: '🍏',
    tint: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    ring: 'ring-emerald-500/25 dark:ring-emerald-500/30',
  },
  'dairy-eggs': {
    emoji: '🥛',
    tint: 'bg-sky-500/10 dark:bg-sky-500/15',
    ring: 'ring-sky-500/25 dark:ring-sky-500/30',
  },
  bakery: {
    emoji: '🥖',
    tint: 'bg-orange-500/10 dark:bg-orange-500/15',
    ring: 'ring-orange-500/25 dark:ring-orange-500/30',
  },
  'snacks-drinks': {
    emoji: '🥤',
    tint: 'bg-rose-500/10 dark:bg-rose-500/15',
    ring: 'ring-rose-500/25 dark:ring-rose-500/30',
  },
  'personal-care': {
    emoji: '🧴',
    tint: 'bg-violet-500/10 dark:bg-violet-500/15',
    ring: 'ring-violet-500/25 dark:ring-violet-500/30',
  },
  pharmacy: {
    emoji: '💊',
    tint: 'bg-teal-500/10 dark:bg-teal-500/15',
    ring: 'ring-teal-500/25 dark:ring-teal-500/30',
  },
  household: {
    emoji: '🧹',
    tint: 'bg-slate-500/10 dark:bg-slate-500/15',
    ring: 'ring-slate-500/25 dark:ring-slate-500/30',
  },
}
const FALLBACK_STYLE = {
  emoji: '🧺',
  tint: 'bg-brand-500/10 dark:bg-brand-500/15',
  ring: 'ring-brand-500/25 dark:ring-brand-500/30',
}

/**
 * Horizontally scrollable category shortcuts.
 * High-contrast, clean circular badges with readable labels underneath.
 */
export function CategoryRow({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-label="Categories" className="mt-6">
      <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {categories.map((c) => {
          const style = SLUG_STYLE[c.slug] ?? FALLBACK_STYLE
          return (
            <Link
              key={c.id}
              href={`/search?category=${encodeURIComponent(c.id)}`}
              className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 transition"
            >
              <span
                className={`${style.tint} ${style.ring} shadow-card bg-surface group-hover:shadow-card-hover grid h-14 w-14 place-items-center rounded-2xl text-2xl ring-1 transition-all duration-200 group-hover:-translate-y-1`}
              >
                {style.emoji}
              </span>
              <span className="text-content/85 group-hover:text-brand-600 dark:group-hover:text-brand-400 text-center text-xs font-semibold leading-tight transition">
                {c.name}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
