import Link from 'next/link'

const CATEGORIES = [
  { label: 'All Categories', emoji: '🧺', tint: 'bg-brand-100' },
  { label: 'Fruits & Vegetables', emoji: '🍏', tint: 'bg-emerald-100' },
  { label: 'Dairy & Milk', emoji: '🥛', tint: 'bg-sky-100' },
  { label: 'Grocery & Staples', emoji: '🛍️', tint: 'bg-amber-100' },
  { label: 'Snacks & Drinks', emoji: '🥤', tint: 'bg-rose-100' },
  { label: 'Personal Care', emoji: '🧴', tint: 'bg-violet-100' },
  { label: 'Pharmacy', emoji: '💊', tint: 'bg-teal-100' },
  { label: 'Electronics', emoji: '💻', tint: 'bg-indigo-100' },
  { label: 'More', emoji: '✨', tint: 'bg-slate-100' },
]

/** Horizontally scrollable category shortcuts (search-backed for now). */
export function CategoryRow() {
  return (
    <section aria-label="Categories" className="mt-6">
      <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.label}
            href={`/search?q=${encodeURIComponent(c.label)}`}
            className="group flex w-20 shrink-0 flex-col items-center gap-2"
          >
            <span
              className={`${c.tint} shadow-card grid h-14 w-14 place-items-center rounded-2xl text-2xl transition group-hover:-translate-y-0.5 group-hover:shadow-md`}
            >
              {c.emoji}
            </span>
            <span className="text-content/80 text-center text-[11px] font-medium leading-tight">
              {c.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
