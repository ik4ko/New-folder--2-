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
  const clientId   = process.env.GHL_CLIENT_ID
  const redirectUri = process.env.GHL_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error: 'GHL OAuth not configured',
        hint: 'Set GHL_CLIENT_ID and GHL_REDIRECT_URI in Vercel environment variables',
        redirect_uri_configured: redirectUri ?? 'NOT SET — must be https://www.aegissage.com/api/ghl/callback',
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
