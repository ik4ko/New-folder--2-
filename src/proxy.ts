/**
 * AegisSage Next.js Edge Middleware
 *
 * Enforces authentication on all protected routes at the edge — before any
 * page component, server action, or API route handler executes.
 *
 * Protected: /dashboard/*, /settings/*, /api/billing/*, /api/ghl/* (dashboard-initiated)
 * Public:    /, /login, /signup, /api/ghl/connect, /api/auth-connect/callback,
 *            /api/extension/sync, /api/stripe/webhook, /api/cron/*
 *
 * HIPAA note: This is the first authentication gate. It does NOT replace
 * per-route auth checks (getUser() calls) — those remain as defense-in-depth.
 * This layer prevents unauthenticated requests from reaching any PHI-handling
 * server component or action.
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// ── Routes that must always be publicly accessible ───────────────────────────
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/auth/reset-password',
  '/auth/confirm',
  '/sign/aor',        // public AOR signing page (token-gated, not session-gated)
  '/privacy-policy',
  '/terms-of-service',
  '/security-compliance',
  '/baa',
  '/compliance',
  '/account-deleted',
]

// ── API routes accessible without a dashboard session ────────────────────────
// These have their own auth mechanisms (HMAC, Bearer key, Stripe sig, etc.)
const PUBLIC_API_PREFIXES = [
  '/api/ghl/connect',           // initiates OAuth — redirects to GHL
  '/api/auth-connect/callback', // OAuth callback — no session cookie yet
  '/api/connect/callback',      // alternate callback path
  '/api/extension/sync',        // Chrome Extension — Bearer key auth
  '/api/extension/verify',
  '/api/extension/alerts',
  '/api/marx',                  // Chrome Extension MARx endpoints
  '/api/stripe/webhook',        // Stripe HMAC verified
  '/api/cron',                  // Vercel cron — CRON_SECRET Bearer
  '/api/scheduler',
  '/api/ghl/sync-status',       // polled from upload page before auth resolves
]

function isPublicPath(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.includes(pathname)) return true
  // Prefix match for public pages
  if (pathname.startsWith('/sign/aor/')) return true
  // API prefix match
  if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) return true
  // Static files and Next.js internals
  if (pathname.startsWith('/_next/')) return true
  if (pathname.startsWith('/favicon')) return true
  if (pathname.startsWith('/images/')) return true
  return false
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always pass through public paths without any auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // ── Supabase session check ────────────────────────────────────────────────
  // createServerClient in middleware uses cookies() to read the Supabase JWT.
  // We call getUser() (server-validated JWT) not getSession() (cookie-only read).
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not authenticated — redirect to login with the original URL as redirect param
    const loginUrl = new URL('/login', req.url)
    // Only set redirect param for dashboard routes (not API routes — those return 401)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
      loginUrl.searchParams.set('redirect', pathname)
    } else if (pathname.startsWith('/api/')) {
      // API routes return 401 JSON, not a redirect
      return NextResponse.json(
        { error: 'Unauthorized — valid session required' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated — allow through
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
