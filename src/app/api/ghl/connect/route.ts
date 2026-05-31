import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

// ── State token helpers ───────────────────────────────────────────────────────
// State encodes userId so the callback can identify the user even if the
// Supabase session cookie is dropped during the GHL OAuth redirect cycle.
// Format (base64url): <userId>.<nonce>.<hmac_first16>

const STATE_SECRET = process.env.GHL_STATE_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? 'ghl-state-aegissage-v1'

export function createGhlState(userId: string): string {
  const nonce = Math.random().toString(36).slice(2, 10)
  const payload = `${userId}.${nonce}`
  const sig = createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16)
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GHL_CLIENT_ID

  // ── Redirect URI resolution ───────────────────────────────────────────────
  // Rules:
  //   1. NEXT_PUBLIC_APP_URL must be set — we never derive origin from the
  //      incoming request because a www vs non-www mismatch causes GHL to
  //      reject the authorization (redirect_uri must match the registered URI
  //      exactly, including scheme and host).
  //   2. GHL bans any registered redirect URI containing the substring "ghl".
  //      The compliant path is /api/connect/callback.
  //   3. If GHL_REDIRECT_URI is set and already points at the compliant path,
  //      use it verbatim. Otherwise auto-correct and warn.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('[ghl/connect] NEXT_PUBLIC_APP_URL is not set — cannot build a stable redirect URI')
    return NextResponse.json(
      {
        error: 'Server misconfiguration',
        hint:  'Set NEXT_PUBLIC_APP_URL=https://www.aegissage.com in Vercel environment variables',
      },
      { status: 503 }
    )
  }
  const origin         = appUrl.replace(/\/$/, '') // strip trailing slash
  const rawRedirectUri = process.env.GHL_REDIRECT_URI ?? ''
  const isDeprecated   = rawRedirectUri.includes('/api/ghl/callback')
  const redirectUri    = (!rawRedirectUri || isDeprecated)
    ? `${origin}/api/connect/callback`
    : rawRedirectUri

  if (isDeprecated) {
    console.warn(
      '[ghl/connect] GHL_REDIRECT_URI still points at the deprecated /api/ghl/callback path.' +
      ` Auto-corrected to "${redirectUri}". Set GHL_REDIRECT_URI=${redirectUri} to suppress this warning.`
    )
  }

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'GHL OAuth not configured',
        hint:  'Set GHL_CLIENT_ID in Vercel environment variables',
        redirect_uri_in_use: redirectUri,
      },
      { status: 503 }
    )
  }

  // Resolve the logged-in user — needed to embed userId in state
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const state = createGhlState(session.user.id)

  console.log('[ghl/connect] initiating OAuth', {
    redirectUri,
    userId: session.user.id.slice(0, 8) + '…',
  })

  const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'contacts.readonly contacts.write locations.readonly')
  authUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authUrl.toString())

  // Store state in a short-lived cookie for CSRF verification in the callback.
  // sameSite:'lax' ensures it is sent when GHL top-level-redirects back to us.
  response.cookies.set('ghl_oauth_state', state, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   600, // 10 minutes
    path:     '/',
  })

  return response
}
