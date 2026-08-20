import { ApiError } from './client'

/**
 * Frontend error-handling strategy. Maps the backend error envelope
 * ({ error: { code, message, details } }, surfaced as `ApiError`) into
 * human-readable UX copy without leaking internals or stack traces.
 */

export type ErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'server'
  | 'network'
  | 'unknown'

export interface FriendlyError {
  kind: ErrorKind
  /** Short, human-readable message safe to show end users. */
  message: string
  /** Original backend code (e.g. `cart_cross_shop`) for component-level UX. */
  code: string | null
}

export function classifyError(err: unknown): FriendlyError {
  if (err instanceof ApiError) {
    const message = err.message || 'Something went wrong.'
    switch (err.status) {
      case 400:
      case 422:
        return { kind: 'validation', message, code: err.code }
      case 401:
        return {
          kind: 'unauthenticated',
          message: 'Your session has expired. Please sign in again.',
          code: err.code,
        }
      case 403:
        return {
          kind: 'forbidden',
          message: "You don't have permission to do that.",
          code: err.code,
        }
      case 404:
        return { kind: 'not_found', message: 'We could not find that.', code: err.code }
      case 409:
        return { kind: 'conflict', message, code: err.code }
      case 429:
        return {
          kind: 'rate_limit',
          message: 'Too many attempts. Please wait a moment and try again.',
          code: err.code,
        }
      default:
        if (err.status >= 500) {
          return {
            kind: 'server',
            message: 'Our service is having trouble. Please try again shortly.',
            code: err.code,
          }
        }
        return { kind: 'unknown', message, code: err.code }
    }
  }
  // Network failure / thrown before a response (offline, DNS, CORS, etc.).
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return {
      kind: 'network',
      message: 'Network error. Check your connection and try again.',
      code: null,
    }
  }
  return { kind: 'unknown', message: 'Something unexpected happened.', code: null }
}

/** True when the error is an auth failure the caller may want to redirect on. */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404
}
