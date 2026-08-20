'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui/StateFeedback'
import { RoleSelect } from './RoleSelect'
import { MethodSelect } from './MethodSelect'
import { EmailSignIn } from './EmailSignIn'
import { PhoneSignIn } from './PhoneSignIn'
import { createClient } from '@/lib/supabase/client'
import {
  isEntryRole,
  landingFor,
  rolesFromAppMetadata,
  sanitizeNext,
  type EntryRole,
} from '@/lib/auth/redirect'
import { AUTH_METHODS, type AuthMethod } from '@/lib/config/auth'

type Step = 'role' | 'method' | 'auth'

const ROLE_HEADING: Record<EntryRole, { title: string; verb: string }> = {
  customer: { title: 'Customer', verb: 'Continue as' },
  shopkeeper: { title: 'Shopkeeper', verb: 'Continue as' },
  rider: { title: 'Rider', verb: 'Continue as' },
  admin: { title: 'Administrator', verb: 'Continue as' },
}

/**
 * Role-first authentication entry flow:
 *
 *   role selection → auth method → email/phone OTP → role-specific surface
 *
 * The selected role is a UX hint only — the destination is derived from the
 * verified JWT `app_metadata.roles` (ADR-0002), so picking a role never grants
 * privileges. A user whose actual role differs is routed to their own area.
 */
export function LoginFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const next = sanitizeNext(params.get('next'))
  const linkError = params.get('error')
  const roleParam = params.get('role')
  const initialRole: EntryRole = isEntryRole(roleParam) ? roleParam : 'customer'

  const [role, setRole] = useState<EntryRole>(initialRole)
  const [step, setStep] = useState<Step>('role')
  const [method, setMethod] = useState<AuthMethod | null>(null)
  const [bootstrapping, setBootstrapping] = useState(false)

  // Already authenticated → go straight to the right surface.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(destinationFor(user.app_metadata, next))
    })
  }, [router, next])

  function onSuccess(user: unknown, token: string | null) {
    setBootstrapping(true)
    // Best-effort: ensure the backend has a user row for this identity so the
    // first authenticated call doesn't fail. /me/profile is idempotent.
    ensureBackendUser(token).finally(() => {
      router.replace(destinationFor((user as { app_metadata?: unknown })?.app_metadata, next))
      router.refresh()
    })
  }

  const heading = ROLE_HEADING[role]

  return (
    <div>
      {linkError === 'auth_callback' ? (
        <p role="alert" className="text-danger mb-4 text-sm">
          That sign-in link didn&apos;t work (it may have expired or been opened on another
          device). Request a new one below.
        </p>
      ) : null}
      {step === 'role' ? (
        <div className="space-y-4">
          <div className="text-center">
            <h1 className="text-content text-xl font-bold">Who are you?</h1>
            <p className="text-muted mt-1 text-sm">Pick how you want to use MohallaShop.</p>
          </div>
          <RoleSelect
            value={role}
            onChange={(r) => {
              setRole(r)
              setStep('method')
            }}
            onAdmin={() => {
              setRole('admin')
              setStep('method')
            }}
          />
        </div>
      ) : step === 'method' ? (
        <div className="space-y-5">
          <div className="text-center">
            <h1 className="text-content text-xl font-bold">Welcome to MohallaShop</h1>
            <p className="text-muted mt-1 text-sm">
              {heading.verb} <span className="text-content font-semibold">{heading.title}</span>
            </p>
          </div>
          <MethodSelect
            onSelect={(m) => {
              // Disabled methods never proceed (MethodSelect also disables the
              // button); this guard keeps a config flip alone from producing a
              // fake sign-in method — ADR-0002.
              if (!AUTH_METHODS[m].enabled) return
              setMethod(m)
              setStep('auth')
            }}
            onBack={() => setStep('role')}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="text-center">
            <h1 className="text-content text-xl font-bold">
              Continue with {AUTH_METHODS[method!].label}
            </h1>
            <p className="text-muted mt-1 text-sm">
              {heading.verb} <span className="text-content font-semibold">{heading.title}</span>
            </p>
          </div>
          {method === 'email' ? (
            <EmailSignIn onSuccess={onSuccess} next={next} />
          ) : (
            <PhoneSignIn onSuccess={onSuccess} />
          )}
          <button
            type="button"
            onClick={() => setStep('method')}
            className="text-muted hover:text-content text-sm underline underline-offset-2"
          >
            Change method
          </button>
        </div>
      )}

      {bootstrapping ? (
        <div className="text-muted mt-4 flex items-center justify-center gap-2 text-sm">
          <Spinner className="text-brand-600 h-4 w-4" />
          Setting up your account
        </div>
      ) : null}
    </div>
  )
}

/** Landing route after a successful sign-in: honour `next`, else role-based. */
function destinationFor(appMetadata: unknown, next: string | null): string {
  if (next) return next
  return landingFor(rolesFromAppMetadata(appMetadata))
}

/**
 * Idempotently ensure the backend has a `users` row for this identity. The
 * profile endpoint bootstraps one on first call. Failures here are non-fatal —
 * the next authenticated call would create it anyway.
 */
async function ensureBackendUser(token: string | null): Promise<void> {
  if (!token) return
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
  try {
    await fetch(`${base}/me/profile`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // ignore — bootstrap is best-effort
  }
}
