import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { landingFor, rolesFromAppMetadata } from '@/lib/auth/redirect'
import { supabaseConfig } from './env'

type CookieToSet = { name: string; value: string; options: CookieOptions }

// Route protection is UX protection (ADR-0002). FastAPI remains the security
// boundary; these guards only keep unauthenticated/incorrect-role users away
// from surfaces they cannot meaningfully use.
//
// The catalogue is browsable by guests (ADR-0006): /home, /shops, /products,
// /search, /categories and /support stay public. Login is demanded only by
// purchase actions — the customer list below — plus the role-gated areas.
const CUSTOMER_PROTECTED = ['/cart', '/checkout', '/orders', '/profile', '/favorites']
const PUBLIC_EXACT = new Set(['/', '/about', '/login'])

function pathnameOf(request: NextRequest): string {
  return request.nextUrl.pathname
}

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return false
  if (pathname === '/shop' || pathname.startsWith('/shop/')) return true
  if (pathname === '/rider' || pathname.startsWith('/rider/')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  return CUSTOMER_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function areaRoles(pathname: string): string[] | null {
  if (pathname === '/shop' || pathname.startsWith('/shop/')) {
    return ['shopkeeper', 'super_admin']
  }
  if (pathname === '/rider' || pathname.startsWith('/rider/')) return ['rider', 'super_admin']
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return ['admin', 'super_admin']
  }
  return null
}

/**
 * Refresh the Supabase session on every navigation, keep auth cookies in sync,
 * and apply coarse UX route protection (auth + role per surface). Returns the
 * response to continue the chain.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Magic-link emails may land on any URL (e.g. the Site URL fallback) with
  // auth params attached — forward them to the callback route that completes
  // sign-in, preserving the query string (and any `next` target).
  if (
    request.nextUrl.pathname !== '/auth/callback' &&
    (request.nextUrl.searchParams.has('code') || request.nextUrl.searchParams.has('token_hash'))
  ) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  // Do not run between `getUser()` calls — keep it as the last async op here.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = pathnameOf(request)

  if (isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    if (!user) {
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
    // Role-restricted surfaces (UX only; backend enforces via require_roles).
    const required = areaRoles(pathname)
    if (required) {
      const roles = rolesFromAppMetadata(user.app_metadata)
      const allowed = required.some((r) => roles.includes(r))
      if (!allowed) {
        const home = request.nextUrl.clone()
        home.pathname = landingFor(roles)
        home.search = ''
        return NextResponse.redirect(home)
      }
    }
  }

  return supabaseResponse
}
