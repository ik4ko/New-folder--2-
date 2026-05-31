/**
 * DEPRECATED — this route has been renamed to /api/connect/callback.
 *
 * GoHighLevel prohibits "ghl" in registered redirect URIs.
 * Update your GHL Marketplace app and set:
 *   GHL_REDIRECT_URI=https://www.aegissage.com/api/connect/callback
 *
 * This stub issues a 308 Permanent Redirect to preserve any in-flight OAuth
 * flows while the registered redirect URI is being updated in GHL.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const dest = new URL('/api/connect/callback', req.url)
  dest.search = req.nextUrl.search
  return NextResponse.redirect(dest, { status: 308 })
}
