import { CartIcon, ClockIcon, ShieldIcon, RotateCcwIcon, HeartIcon } from '@/components/icons'

const FEATURES = [
  {
    icon: CartIcon,
    title: 'Multi-Shop Cart',
    desc: 'Order from multiple shops in one go',
    color: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  },
  {
    icon: ClockIcon,
    title: 'Fast Delivery',
    desc: '15–30 min delivery at your doorstep',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: ShieldIcon,
    title: 'Secure Payments',
    desc: '100% safe & trusted payment methods',
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    icon: RotateCcwIcon,
    title: 'Easy Returns',
    desc: 'Not satisfied? Return easily',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: HeartIcon,
    title: 'Support Local',
    desc: 'Empowering local shops and communities',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
]

/** Premium trust/features strip at the bottom of the customer home — compact. */
export function FeatureStrip() {
  return (
    <section className="border-border bg-surface shadow-card mt-6 grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-3 lg:grid-cols-5">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex items-start gap-2.5">
          <span
            className={`${f.color} border-border/50 grid h-9 w-9 shrink-0 place-items-center rounded-xl border`}
          >
            <f.icon className="h-4.5 w-4.5" />
          </span>
          <span>
            <span className="text-content block text-sm font-semibold">{f.title}</span>
            <span className="text-muted mt-0.5 block text-xs leading-snug">{f.desc}</span>
          </span>
        </div>
      ))}
    </section>
  )
}
