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
