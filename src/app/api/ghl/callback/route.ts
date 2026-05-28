/**
 * GET /api/ghl/callback
 *
 * GHL OAuth 2.0 callback handler.
 *
 * Responsibility: ONLY exchange the authorization code for tokens and persist
 * them. Contact sync is intentionally NOT performed here — doing so would
 * risk a 60-second Vercel timeout for accounts with 500+ contacts.
 *
 * After storing tokens, we redirect to /ghl?autoSync=1 so the GHL page can
 * trigger a proper incremental/full sync with a real progress bar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createHmac } from 'crypto'

const GHL_CLIENT_ID     = process.env.GHL_CLIENT_ID!
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET!
const GHL_REDIRECT_URI  = process.env.GHL_REDIRECT_URI!
const GHL_API_BASE      = 'https://services.leadconnectorhq.com'

const STATE_SECRET = process.env.GHL_STATE_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? 'ghl-state-aegissage-v1'

// ── State verification ────────────────────────────────────────────────────────
function extractUserIdFromState(state: string | null): string | null {
  if (!state) return null
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const lastDot = decoded.lastIndexOf('.')
    if (lastDot < 0) return null
    const payload  = decoded.slice(0, lastDot)
    const sig      = decoded.slice(lastDot + 1)
    const expected = createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16)
    if (sig !== expected) {
      console.warn('[ghl/callback] state HMAC mismatch')
      return null
    }
    const userId = payload.split('.')[0]
    return userId && userId.length > 30 ? userId : null
  } catch {
    return null
  }
}

// ── Token exchange ────────────────────────────────────────────────────────────
async function exchangeCodeForTokens(code: string) {
  const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GHL_CLIENT_ID,
      client_secret: GHL_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  GHL_REDIRECT_URI,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL token exchange failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<{
    access_token:  string
    refresh_token: string
    expires_in:    number
    locationId:    string
  }>
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url   = req.nextUrl
  const code  = req.nextUrl.searchParams.get('code')
  const state = url.searchParams.get('state')

  // -- Identify user via state token first (resilient to session loss)
  let userId: string | null = null

  const cookieState = req.cookies.get('ghl_oauth_state')?.value ?? null
  if (state && cookieState && state === cookieState) {
    userId = extractUserIdFromState(state)
  }

  if (!userId) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    userId = session?.user?.id ?? null
  }

  if (!userId) {
    console.error('[ghl/callback] cannot identify user — state mismatch and no session')
    return NextResponse.redirect(new URL('/login?reason=ghl_auth_failed', req.url))
  }

  if (!code) {
    console.error('[ghl/callback] no code param — redirect_uri mismatch or user cancelled')
    return NextResponse.redirect(new URL('/ghl?error=no_code', req.url))
  }

  const serviceClient = createServiceClient()

  const { data: broker } = await serviceClient
    .from('brokers')
    .select('id, agency_id')
    .eq('user_id', userId)
    .single()

  if (!broker) {
    console.error('[ghl/callback] no broker row for userId:', userId)
    return NextResponse.redirect(new URL('/ghl?error=no_broker', req.url))
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    console.error('[ghl/callback] token exchange error:', err)
    return NextResponse.redirect(new URL('/ghl?error=auth_failed', req.url))
  }

  const now       = new Date().toISOString()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Persist tokens only — no contact sync here
  await serviceClient.from('agency_credentials').upsert(
    {
      agency_id:     broker.agency_id,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      location_id:   tokens.locationId,
      updated_at:    now,
    },
    { onConflict: 'agency_id' }
  )

  // Stamp last_synced_at (non-fatal if column not yet present)
  try {
    await serviceClient.from('agency_credentials')
      .update({ last_synced_at: null, sync_status: 'pending' } as Record<string, unknown>)
      .eq('agency_id', broker.agency_id)
  } catch {
    // Migration 20260528000000 adds these columns — safe to ignore until applied
  }

  // Update broker row
  await serviceClient
    .from('brokers')
    .update({ ghl_location_id: tokens.locationId, ghl_connected_at: now })
    .eq('id', broker.id)

  console.log(`[ghl/callback] tokens saved for agency ${broker.agency_id} — redirecting to sync UI`)

  // Clear state cookie and redirect to GHL page with autoSync flag
  const response = NextResponse.redirect(new URL('/ghl?connected=1&autoSync=1', req.url))
  response.cookies.set('ghl_oauth_state', '', { maxAge: 0, path: '/' })
  return response
}
