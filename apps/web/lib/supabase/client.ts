'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseConfig } from './env'

/** Supabase client for browser/client components. */
export function createClient() {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
}
