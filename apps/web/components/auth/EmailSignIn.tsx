'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/auth/errors'

type Step = 'email' | 'code'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_RE = /^\d{4,8}$/

/**
 * Email OTP sign-in (Supabase `signInWithOtp` + `verifyOtp` type `email`).
 * No password storage anywhere — Supabase remains the identity provider.
 *
 * The emailed link (magic-link template) is pointed at `/auth/callback` via
 * `emailRedirectTo` so clicking it completes sign-in too; the numeric code
 * path below covers templates that send `{{ .Token }}`.
 */
export function EmailSignIn({
  onSuccess,
  next,
}: {
  onSuccess: (user: unknown, token: string | null) => void
  next?: string | null
}) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState<'idle' | 'sending' | 'verifying'>('idle')
  const [error, setError] = useState<string | null>(null)
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

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      setError('Enter a valid email address, e.g. you@example.com.')
      return
    }
    setLoading('sending')
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: { emailRedirectTo: emailRedirectTo() },
      })
      if (otpError) throw otpError
      setEmail(normalized)
      setStep('code')
      setInfo('We sent a code by email. It is valid for a few minutes.')
      setResendIn(30)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  async function resend() {
    if (resendIn > 0) return
    setError(null)
    setInfo(null)
    setLoading('sending')
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: emailRedirectTo() },
      })
      if (otpError) throw otpError
      setInfo('A new code has been sent.')
      setResendIn(30)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const code = otp.trim()
    if (!OTP_RE.test(code)) {
      setError('Enter the numeric code you received.')
      return
    }
    setLoading('verifying')
    try {
      const supabase = createClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })
      if (verifyError) throw verifyError
      setInfo('Signed in. Preparing your account…')
      onSuccess(data.user, data.session?.access_token ?? null)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading('idle')
    }
  }

  const busy = loading !== 'idle'

  return (
    <div>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4" noValidate>
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
              className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 text-base outline-none disabled:opacity-60"
              required
            />
            <p className="text-muted mt-1 text-xs">
              We&apos;ll send you a one-time code — no password needed.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          ) : null}
          {info ? <p className="text-success text-sm">{info}</p> : null}
          <Button
            type="submit"
            className="w-full"
            disabled={busy}
            isLoading={loading === 'sending'}
          >
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4" noValidate>
          <div>
            <label htmlFor="auth-otp" className="text-content block text-sm font-medium">
              Enter the 6-digit code sent to {email}
            </label>
            <input
              id="auth-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={busy}
              className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 text-base tracking-[0.4em] outline-none disabled:opacity-60"
              required
              autoFocus
            />
            <p className="text-muted mt-1 text-xs">
              Check your inbox (and spam). No code? If the email has a sign-in button instead, click
              it to complete sign-in.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          ) : null}
          {info ? <p className="text-success text-sm">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={busy} isLoading={busy}>
            {loading === 'verifying' ? 'Verifying…' : 'Verify & sign in'}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
                setError(null)
                setInfo(null)
              }}
              className="text-muted hover:text-content underline disabled:opacity-60"
              disabled={busy}
            >
              Change email
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={busy || resendIn > 0}
              className="text-brand-700 hover:text-brand-800 underline disabled:opacity-60"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
