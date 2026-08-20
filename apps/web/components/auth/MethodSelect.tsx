'use client'

import type { ReactNode } from 'react'
import { buttonClasses } from '@/components/ui/Button'
import { AUTH_METHODS, type AuthMethod } from '@/lib/config/auth'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  )
}

const METHOD_ICONS: Record<AuthMethod, ReactNode> = {
  google: <GoogleIcon />,
  email: <MailIcon />,
  phone: <PhoneIcon />,
}

/**
 * Authentication method chooser. Only methods marked `enabled` in
 * AUTH_METHODS are selectable; disabled methods render as "Coming soon" and
 * never navigate to a form (no fake auth, ADR-0002).
 */
export function MethodSelect({
  onSelect,
  onBack,
}: {
  onSelect: (method: AuthMethod) => void
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!AUTH_METHODS.google.enabled}
        onClick={() => onSelect('google')}
        className={
          buttonClasses('outline', 'lg') + ' w-full disabled:cursor-not-allowed disabled:opacity-60'
        }
        aria-disabled={!AUTH_METHODS.google.enabled}
        title={AUTH_METHODS.google.note}
      >
        {METHOD_ICONS.google}
        Continue with {AUTH_METHODS.google.label}
        {!AUTH_METHODS.google.enabled ? (
          <span className="text-muted ml-1 text-xs font-normal">Coming soon</span>
        ) : null}
      </button>

      <div className="text-muted flex items-center gap-3 py-1 text-xs uppercase tracking-wider">
        <span className="bg-border h-px flex-1" />
        or
        <span className="bg-border h-px flex-1" />
      </div>

      {(['email', 'phone'] as AuthMethod[]).map((method) => {
        const config = AUTH_METHODS[method]
        return (
          <button
            key={method}
            type="button"
            disabled={!config.enabled}
            onClick={() => onSelect(method)}
            className={
              buttonClasses('outline', 'lg') +
              ' w-full disabled:cursor-not-allowed disabled:opacity-60'
            }
            aria-disabled={!config.enabled}
            title={config.note}
          >
            {METHOD_ICONS[method]}
            Continue with {config.label}
            {!config.enabled ? (
              <span className="text-muted ml-1 text-xs font-normal">Coming soon</span>
            ) : null}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onBack}
        className="text-muted hover:text-content text-sm underline underline-offset-2"
      >
        Change role
      </button>
    </div>
  )
}
