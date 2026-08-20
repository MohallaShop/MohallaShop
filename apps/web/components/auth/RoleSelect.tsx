'use client'

import { BagIcon, BikeIcon, ShieldIcon, StoreIcon } from '@/components/icons'
import { cn } from '@/lib/utils/cn'
import type { EntryRole } from '@/lib/auth/redirect'

interface RoleOption {
  role: EntryRole
  title: string
  desc: string
  icon: (props: { className?: string }) => React.ReactNode
  primary?: boolean
}

const OPTIONS: RoleOption[] = [
  {
    role: 'customer',
    title: 'Customer',
    desc: 'Shop and order from nearby stores',
    icon: (p) => <BagIcon className={p.className} />,
    primary: true,
  },
  {
    role: 'shopkeeper',
    title: 'Shopkeeper',
    desc: 'Manage your shop and orders',
    icon: (p) => <StoreIcon className={p.className} />,
  },
  {
    role: 'rider',
    title: 'Rider',
    desc: 'Manage your deliveries',
    icon: (p) => <BikeIcon className={p.className} />,
  },
]

export function RoleSelect({
  value,
  onChange,
  onAdmin,
}: {
  value: EntryRole
  onChange: (role: EntryRole) => void
  onAdmin: () => void
}) {
  return (
    <div>
      <div className="grid gap-3">
        {OPTIONS.map((option) => {
          const selected = value === option.role
          return (
            <button
              key={option.role}
              type="button"
              onClick={() => onChange(option.role)}
              aria-pressed={selected}
              className={cn(
                'border-border bg-surface shadow-card flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition',
                'hover:shadow-elevated hover:-translate-y-0.5',
                selected
                  ? 'border-brand-600 ring-brand-200 bg-brand-50 ring-2'
                  : option.primary
                    ? 'border-brand-300'
                    : '',
              )}
            >
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                  selected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
                )}
              >
                {option.icon({ className: 'h-5 w-5' })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-content flex items-center gap-2 text-base font-semibold">
                  {option.title}
                  {option.primary ? (
                    <span className="bg-brand-600 text-brand-50 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      Start here
                    </span>
                  ) : null}
                </span>
                <span className="text-muted mt-0.5 block text-sm">{option.desc}</span>
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onAdmin}
        className="text-muted hover:text-content mx-auto mt-5 flex items-center gap-1.5 text-sm underline underline-offset-2"
      >
        <ShieldIcon className="h-3.5 w-3.5" />
        Platform administrator? Sign in
      </button>
    </div>
  )
}
