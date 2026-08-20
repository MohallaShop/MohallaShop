/**
 * Centralized Supabase project config read from the environment.
 *
 * Supports both key formats issued by Supabase:
 * - legacy anon key  (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `eyJ…`)
 * - publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `sb_publishable_…`)
 * Publishable key wins when both are set.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith('replace-with')) {
    if (typeof window !== 'undefined') {
      // Browser: avoid crashing the page; auth will simply not be wired.
      return ''
    }
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const supabaseConfig = {
  get url(): string {
    return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get anonKey(): string {
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (publishable && !publishable.startsWith('replace-with')) return publishable
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  },
}
