import { HeartIcon, RotateCcwIcon, ScooterIcon, ShieldIcon, StoreIcon } from '@/components/icons'

const FEATURES = [
  {
    icon: StoreIcon,
    title: 'Local Shops',
    desc: 'Order from neighbourhood shops you trust',
  },
  {
    icon: ScooterIcon,
    title: 'Doorstep Delivery',
    desc: 'Shops prepare and deliver your order to you',
  },
  {
    icon: ShieldIcon,
    title: 'Verified Sellers',
    desc: 'Shops and products are reviewed by MohallaShop',
  },
  {
    icon: RotateCcwIcon,
    title: 'Fair Resolution',
    desc: 'Issues with an order? We help make it right',
  },
  {
    icon: HeartIcon,
    title: 'Support Local',
    desc: 'Every order supports your local economy',
  },
]

/** Trust/features strip shown below the deals row on the customer home. */
export function FeatureStrip() {
  return (
    <section className="border-border bg-surface shadow-card mt-8 grid grid-cols-2 gap-4 rounded-2xl border p-5 sm:grid-cols-3 lg:grid-cols-5">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex items-start gap-3">
          <span className="bg-brand-50 text-brand-600 grid h-10 w-10 shrink-0 place-items-center rounded-xl">
            <f.icon className="h-5 w-5" />
          </span>
          <span>
            <span className="text-content block text-sm font-bold">{f.title}</span>
            <span className="text-muted mt-0.5 block text-xs leading-snug">{f.desc}</span>
          </span>
        </div>
      ))}
    </section>
  )
}
