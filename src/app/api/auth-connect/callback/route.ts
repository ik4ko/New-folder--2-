import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    console.error('[GHL callback] missing code param');
    return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error`);
  }

  const clientId     = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  // Self-healing redirect URI: GHL bans "ghl" in registered redirect URIs.
  // Auto-correct if GHL_REDIRECT_URI is unset or still holds the deprecated path.
  const rawUri     = process.env.GHL_REDIRECT_URI ?? '';
  const appOrigin  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.aegissage.com';
  const redirectUri = (!rawUri || rawUri.includes('/api/ghl/callback'))
    ? `${appOrigin}/api/connect/callback`
    : rawUri;

  if (rawUri && rawUri.includes('/api/ghl/callback')) {
    console.warn('[auth-connect/callback] GHL_REDIRECT_URI points at deprecated /api/ghl/callback — auto-corrected.');
  }

  if (!clientId || !clientSecret) {
    console.error('[GHL callback] GHL env vars not configured');
    return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error&reason=ghl_not_configured`);
  }

  try {
    // -- 1. Verify authenticated session and resolve agency_id ----------------
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options));
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) {
      console.error('[GHL callback] no authenticated session:', sessionError);
      return NextResponse.redirect(`${APP_URL}/login`);
    }

    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (agencyError || !agency) {
      console.error('[GHL callback] agency lookup failed:', agencyError);
      return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error&reason=oauth_failed`);
    }

    const agencyId = agency.id;

    // -- 2. Exchange code for tokens ------------------------------------------
    const tokenRes = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[GHL callback] token exchange failed:', tokenRes.status, errText);
      return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error&reason=oauth_failed`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      locationId?: string;
      companyId?: string;
    };

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const locationId = tokenData.locationId ?? tokenData.companyId ?? null;

    // -- 3. Single upsert into agency_credentials -----------------------------
    const { error: upsertError } = await supabaseAdmin
      .from('agency_credentials')
      .upsert(
        {
          agency_id: agencyId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          location_id: locationId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'agency_id' }
      );

    if (upsertError) {
      console.error('[GHL callback] agency_credentials upsert failed:', upsertError);
      return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error&reason=oauth_failed`);
    }

    // -- 4. Append-only audit entry -------------------------------------------
    await supabaseAdmin.from('audit_log').insert({
      agency_id: agencyId,
      user_id: user.id,
      action: 'GHL_CONNECTED',
      resource_type: 'agency_credentials',
      resource_id: locationId ?? agencyId,
      metadata: { expires_at: expiresAt, location_id: locationId },
    });

    // -- 5. Success: route to Book of Business with import success flag --------
    // The /ghl standalone page is deprecated. GHL is now a data source embedded
    // inside the unified import interface (/dashboard/churn/upload).
    // The ?ghl=connected flag triggers a toast in the import page confirming
    // the connection and prompting a background sync.
    return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=connected`);

  } catch (err: any) {
    console.error('[GHL callback] unexpected error:', err?.message ?? err);
    return NextResponse.redirect(`${APP_URL}/dashboard/churn/upload?ghl=error`);
  }
}
