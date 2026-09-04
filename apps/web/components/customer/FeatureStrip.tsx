import { BikeIcon, CartIcon, HeartIcon, ReceiptIcon, StoreIcon } from '@/components/icons'

const FEATURES = [
  {
    icon: StoreIcon,
    title: 'Local Shops',
    desc: 'Browse active shops and their products.',
    color: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  },
  {
    icon: CartIcon,
    title: 'Single-Shop Cart',
    desc: 'Checkout one shop order at a time.',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: ReceiptIcon,
    title: 'COD Orders',
    desc: 'Place cash-on-delivery orders.',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    icon: BikeIcon,
    title: 'Delivery Flow',
    desc: 'Riders update pickup and delivery status.',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: HeartIcon,
    title: 'Favorites',
    desc: 'Save shops you order from often.',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
]

export function FeatureStrip() {
  return (
    <section className="border-border bg-surface shadow-card mt-6 grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-5">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex min-w-0 items-start gap-2.5">
          <span
            className={`${f.color} border-border/50 grid h-9 w-9 shrink-0 place-items-center rounded-xl border`}
          >
            <f.icon className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0">
            <span className="text-content block text-sm font-semibold">{f.title}</span>
            <span className="text-muted mt-0.5 block text-xs leading-snug">{f.desc}</span>
          </span>
        </div>
      ))}
    </section>
  )
}
