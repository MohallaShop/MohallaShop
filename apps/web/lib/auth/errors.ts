import { classifyError } from '@/lib/api/errors'

/**
 * Map a Supabase auth error (or any thrown error) into end-user copy. Supabase
 * errors carry a `message`; everything else goes through the API error
 * classifier so one strategy is used everywhere.
 */
export function friendlyAuthError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return classifyError(err).message
}

export interface AuthErrorKind {
  /** Human-readable message safe to show inline. */
  message: string
  /** Sign-in was rejected because the email has not been verified yet. */
  needsVerification: boolean
  /** Wrong email/password combination. */
  invalidCredentials: boolean
  /** Sign-up was rejected because the email already has an account. */
  alreadyRegistered: boolean
}

function errorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return null
}

function errorCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string') return code
  }
  return null
}

/**
 * Classify a Supabase auth error for the sign-in/sign-up forms. Supabase
 * reports some conditions via `error.code` (newer clients) and others only via
 * `error.message` wording — both are matched so behaviour does not depend on
 * the client version.
 */
export function classifyAuthError(err: unknown): AuthErrorKind {
  const message = errorMessage(err)
  const code = errorCode(err)
  const lower = message?.toLowerCase() ?? ''

  return {
    message: message ?? classifyError(err).message,
    needsVerification: code === 'email_not_confirmed' || lower.includes('email not confirmed'),
    invalidCredentials:
      code === 'invalid_credentials' || lower.includes('invalid login credentials'),
    alreadyRegistered: lower.includes('already registered'),
  }
}
