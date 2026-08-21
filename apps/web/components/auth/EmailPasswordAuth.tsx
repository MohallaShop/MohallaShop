'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { classifyAuthError, type AuthErrorKind } from '@/lib/auth/errors'

type Mode = 'signin' | 'signup' | 'verify-email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8
const RESEND_COOLDOWN_S = 60

const inputClasses =
  'border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 text-base outline-none disabled:opacity-60'

/**
 * Email + password authentication (Supabase `signInWithPassword` / `signUp`).
 *
 * New accounts verify by email link: `signUp` sends Supabase's default
 * "Confirm signup" email containing `{{ .ConfirmationURL }}`, which lands on
 * `/auth/callback` and establishes the session. No numeric OTP is involved —
 * Supabase's email service does not send codes with the default templates.
 */
export function EmailPasswordAuth({
  onSuccess,
  next,
}: {
  onSuccess: (user: unknown, token: string | null) => void
  next?: string | null
}) {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [loading, setLoading] = useState<'idle' | 'signin' | 'signup' | 'resend'>('idle')
  const [error, setError] = useState<AuthErrorKind | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  function emailRedirectTo(): string {
    const url = new URL('/auth/callback', window.location.origin)
    if (next) url.searchParams.set('next', next)
    return url.toString()
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      setError({ ...EMPTY_KIND, message: 'Enter a valid email address, e.g. you@example.com.' })
      return
    }
    if (!password) {
      setError({ ...EMPTY_KIND, message: 'Enter your password.' })
      return
    }
    setLoading('signin')
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (err) {
        const kind = classifyAuthError(err)
        if (kind.needsVerification) {
          // Account exists but the email link was never clicked.
          setPendingEmail(normalized)
          setMode('verify-email')
          setResendIn(RESEND_COOLDOWN_S)
        }
        setError(kind)
        return
      }
      onSuccess(data.user, data.session?.access_token ?? null)
    } catch (err) {
      setError(classifyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const normalized = email.trim().toLowerCase()
    if (!name.trim()) {
      setError({ ...EMPTY_KIND, message: 'Enter your name so shops know who to deliver to.' })
      return
    }
    if (!EMAIL_RE.test(normalized)) {
      setError({ ...EMPTY_KIND, message: 'Enter a valid email address, e.g. you@example.com.' })
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError({
        ...EMPTY_KIND,
        message: `Password must be at least ${MIN_PASSWORD} characters long.`,
      })
      return
    }
    setLoading('signup')
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          emailRedirectTo: emailRedirectTo(),
          data: { display_name: name.trim() },
        },
      })
      if (err) {
        setError(classifyAuthError(err))
        return
      }
      if (data.session) {
        // Email confirmation disabled in the Supabase project — signed in now.
        onSuccess(data.user, data.session.access_token ?? null)
        return
      }
      // Confirmation email sent — the link in it completes sign-in.
      setPendingEmail(normalized)
      setMode('verify-email')
      setResendIn(RESEND_COOLDOWN_S)
    } catch (err) {
      setError(classifyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  async function resendVerification() {
    if (resendIn > 0 || !pendingEmail) return
    setError(null)
    setInfo(null)
    setLoading('resend')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: emailRedirectTo() },
      })
      if (err) {
        setError(classifyAuthError(err))
        return
      }
      setInfo('A new verification link has been sent.')
      setResendIn(RESEND_COOLDOWN_S)
    } catch (err) {
      setError(classifyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  const busy = loading !== 'idle'

  if (mode === 'verify-email') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <span className="bg-brand-100 text-brand-700 mx-auto grid h-12 w-12 place-items-center rounded-full text-xl">
            ✉️
          </span>
          <h2 className="text-content mt-3 text-lg font-bold">Check your email</h2>
          <p className="text-muted mt-1 text-sm">
            We sent a verification link to{' '}
            <span className="text-content font-medium">{pendingEmail}</span>. Click it to activate
            your account — you&apos;ll be signed in right after.
          </p>
          <p className="text-muted mt-2 text-xs">
            Can&apos;t find it? Check your spam folder before requesting a new link.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error.message}
          </p>
        ) : null}
        {info ? <p className="text-success text-sm">{info}</p> : null}
        <Button
          type="button"
          className="w-full"
          onClick={resendVerification}
          disabled={busy || resendIn > 0}
          isLoading={loading === 'resend'}
        >
          {resendIn > 0 ? `Resend link in ${resendIn}s` : 'Resend verification link'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
            setInfo(null)
          }}
          className="text-muted hover:text-content w-full text-sm underline underline-offset-2"
          disabled={busy}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="border-border grid grid-cols-2 rounded-xl border p-1" role="tablist">
        {(['signin', 'signup'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => {
              setMode(tab)
              setError(null)
              setInfo(null)
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === tab ? 'bg-brand-600 text-white' : 'text-muted hover:text-content'
            }`}
          >
            {tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      {mode === 'signin' ? (
        <form onSubmit={signIn} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="auth-email" className="text-content block text-sm font-medium">
              Email address
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-content block text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className={inputClasses}
              required
            />
          </div>
          {error ? (
            <AuthErrorAlert kind={error} onSwitchToSignup={() => setMode('signup')} />
          ) : null}
          {info ? <p className="text-success text-sm">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={busy} isLoading={loading === 'signin'}>
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={signUp} className="mt-5 space-y-4" noValidate>
          <div>
            <label htmlFor="auth-name" className="text-content block text-sm font-medium">
              Your name
            </label>
            <input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-email" className="text-content block text-sm font-medium">
              Email address
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className={inputClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="text-content block text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className={inputClasses}
              required
              minLength={MIN_PASSWORD}
            />
          </div>
          {error ? (
            <AuthErrorAlert kind={error} onSwitchToSignin={() => setMode('signin')} />
          ) : null}
          {info ? <p className="text-success text-sm">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={busy} isLoading={loading === 'signup'}>
            Create account
          </Button>
          <p className="text-muted text-xs">
            We&apos;ll email you a verification link — click it to activate your account.
          </p>
        </form>
      )}

      <p className="text-muted border-border mt-5 border-t pt-4 text-center text-xs">
        Shopkeeper or rider? Use the same form — you&apos;ll land in your dashboard.
      </p>
    </div>
  )
}

const EMPTY_KIND: AuthErrorKind = {
  message: '',
  needsVerification: false,
  invalidCredentials: false,
  alreadyRegistered: false,
}

/** Error copy plus a corrective action for the two recoverable cases. */
function AuthErrorAlert({
  kind,
  onSwitchToSignup,
  onSwitchToSignin,
}: {
  kind: AuthErrorKind
  onSwitchToSignup?: () => void
  onSwitchToSignin?: () => void
}) {
  return (
    <p role="alert" className="text-danger text-sm">
      {kind.needsVerification
        ? 'Your email is not verified yet. Use the resend button below to get a new verification link.'
        : kind.invalidCredentials
          ? 'Wrong email or password.'
          : kind.message}
      {kind.invalidCredentials && onSwitchToSignup ? (
        <>
          {' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-brand-700 hover:text-brand-800 underline"
          >
            New here? Create an account
          </button>
        </>
      ) : null}
      {kind.alreadyRegistered && onSwitchToSignin ? (
        <>
          {' '}
          <button
            type="button"
            onClick={onSwitchToSignin}
            className="text-brand-700 hover:text-brand-800 underline"
          >
            Sign in instead
          </button>
        </>
      ) : null}
    </p>
  )
}
