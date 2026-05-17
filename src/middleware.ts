import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/ghl', '/vault', '/members', '/clients', '/ai', '/accounting', '/check-ins']
const DASHBOARD_PREFIX = '/dashboard'

// Public routes that must never be gated
const PUBLIC_ROUTES = [
  '/', '/login', '/signup', '/pricing', '/about', '/terms', '/privacy', '/baa', '/support',
  '/auth/confirm', '/auth/reset-password', '/auth/update-password',
  '/api/auth-connect', '/api/auth-connect/callback', '/api/auth-connect/connect',
  '/api/stripe/webhook',
  '/lp/', '/docs/', '/sign/',
]

function isPublic(path: string): boolean {
  return PUBLIC_ROUTES.some(p => {
    if (path === p) return true
    if (p.length > 1 && path.startsWith(p)) return true
    return false
  })
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const path = request.nextUrl.pathname

  // Always allow public routes
  if (isPublic(path)) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and getUser
  let user: any = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (e: any) {
    console.error('[middleware] supabase.auth.getUser failed:', e?.message, {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
      keyLen: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      keyHasBadChars: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? [...process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY].some(c => c.charCodeAt(0) > 127)
        : 'key missing',
      urlHasBadChars: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [...process.env.NEXT_PUBLIC_SUPABASE_URL].some(c => c.charCodeAt(0) > 127)
        : 'url missing',
    })
    return supabaseResponse // fail-open
  }

  const isProtected = PROTECTED_PREFIXES.some(p => path.startsWith(p))
  const isDashboard = path.startsWith(DASHBOARD_PREFIX)

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }

  // Access gate: /dashboard/* requires active subscription, beta, or valid trial
  // No caching -- check runs on every request (Supabase DB lookup is fast and this prevents stale-state lockouts)
  if (user && isDashboard) {
    const allowed = await checkAgencyAccess(user.id)
    if (!allowed) {
      const signupUrl = request.nextUrl.clone()
      signupUrl.pathname = '/signup'
      signupUrl.searchParams.set('plan', 'beta')
      return NextResponse.redirect(signupUrl)
    }
  }

  return supabaseResponse
}

async function checkAgencyAccess(userId: string): Promise<boolean> {
  try {
    const supabase = getServiceClient()

    const { data: agency } = await supabase
      .from('agencies')
      .select('is_beta, subscription_status, trial_expires_at')
      .eq('owner_id', userId)
      .maybeSingle()

    if (agency) return agencyHasAccess(agency)

    const { data: broker } = await supabase
      .from('brokers')
      .select('agency_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!broker?.agency_id) return true // no agency yet -- fail-open for new users

    const { data: brokerAgency } = await supabase
      .from('agencies')
      .select('is_beta, subscription_status, trial_expires_at')
      .eq('id', broker.agency_id)
      .maybeSingle()

    if (!brokerAgency) return true // fail-open
    return agencyHasAccess(brokerAgency)
  } catch {
    // Any DB/network error -> fail-open: never lock out users due to infrastructure issues
    return true
  }
}

function agencyHasAccess(agency: {
  is_beta: boolean | null
  subscription_status: string | null
  trial_expires_at: string | null
}): boolean {
  if (agency.is_beta) return true
  if (agency.subscription_status === 'active') return true
  if (agency.subscription_status === 'beta') return true
  if (agency.trial_expires_at && new Date(agency.trial_expires_at) > new Date()) return true
  return false
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
