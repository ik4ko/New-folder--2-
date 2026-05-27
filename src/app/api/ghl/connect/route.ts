import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const clientId = process.env.GHL_CLIENT_ID
  const redirectUri = process.env.GHL_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'GHL OAuth not configured — set GHL_CLIENT_ID and GHL_REDIRECT_URI' },
      { status: 503 }
    )
  }

  const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', 'contacts.readonly contacts.write locations.readonly')

  return NextResponse.redirect(authUrl.toString())
}
