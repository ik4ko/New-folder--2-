import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GHL_CLIENT_ID     = process.env.GHL_CLIENT_ID!;
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET!;
const GHL_REDIRECT_URI  = process.env.GHL_REDIRECT_URI!;
const GHL_API_BASE      = 'https://services.leadconnectorhq.com';

// ── MBI sanitization (identical master copy) ─────────────────────────────────
function sanitizeMbi(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim().slice(0, 11);
}

// ── GHL custom field key aliases → our field names ───────────────────────────
const GHL_FIELD_MAP: Record<string, string> = {
  mbi:                    'mbi',
  medicare_id:            'mbi',
  medicare_number:        'mbi',
  plan_name:              'plan_name',
  plan:                   'plan_name',
  carrier:                'carrier',
  insurance_carrier:      'carrier',
};

function extractGhlFields(contact: Record<string, unknown>) {
  const customFields = (contact.customFields ?? contact.custom_fields ?? []) as
    Array<{ key?: string; id?: string; value?: unknown }>;

  const extracted: Record<string, string> = {};
  for (const field of customFields) {
    const key = (field.key ?? field.id ?? '').toLowerCase().replace(/\s+/g, '_');
    const mapped = GHL_FIELD_MAP[key];
    if (mapped && field.value) {
      extracted[mapped] = String(field.value).trim();
    }
  }
  return extracted;
}

// ── Token exchange ────────────────────────────────────────────────────────────
async function exchangeCodeForTokens(code: string) {
  const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GHL_CLIENT_ID,
      client_secret: GHL_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  GHL_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL token exchange failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    locationId: string;
  }>;
}

// ── Fetch all contacts from a GHL location ───────────────────────────────────
async function fetchGhlContacts(accessToken: string, locationId: string) {
  const contacts: Record<string, unknown>[] = [];
  let after: string | null = null;

  do {
    const url = new URL(`${GHL_API_BASE}/contacts/`);
    url.searchParams.set('locationId', locationId);
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('startAfter', after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
    });
    if (!res.ok) break;

    const json = await res.json() as {
      contacts?: Record<string, unknown>[];
      meta?: { nextPageUrl?: string; startAfter?: string };
    };

    const batch = json.contacts ?? [];
    contacts.push(...batch);
    after = batch.length === 100 ? (json.meta?.startAfter ?? null) : null;
  } while (after);

  return contacts;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?ghl=missing_code', req.url));
  }

  // Resolve broker + agency
  const { data: broker } = await supabase
    .from('brokers')
    .select('id, agency_id')
    .eq('user_id', session.user.id)
    .single();

  if (!broker) {
    return NextResponse.redirect(new URL('/dashboard?ghl=no_broker', req.url));
  }

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error('[ghl/callback] token exchange error:', err);
    return NextResponse.redirect(new URL('/dashboard?ghl=auth_error', req.url));
  }

  // Persist tokens in agency_credentials
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from('agency_credentials').upsert(
    {
      agency_id:     broker.agency_id,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      location_id:   tokens.locationId,
      updated_at:    new Date().toISOString(),
    },
    { onConflict: 'agency_id' }
  );

  // Also stamp the broker row
  await supabase
    .from('brokers')
    .update({ ghl_location_id: tokens.locationId, ghl_connected_at: new Date().toISOString() })
    .eq('id', broker.id);

  // Pull and sync contacts
  let synced = 0;
  try {
    const ghlContacts = await fetchGhlContacts(tokens.access_token, tokens.locationId);

    const records = ghlContacts
      .map((contact) => {
        const fields = extractGhlFields(contact);
        const rawMbi = fields.mbi ?? '';
        const mbi = sanitizeMbi(rawMbi);
        if (!mbi) return null;

        const fullName = [
          String(contact.firstName ?? ''),
          String(contact.lastName ?? ''),
        ].filter(Boolean).join(' ') || String(contact.name ?? '') || null;

        return {
          agency_id:           broker.agency_id,
          broker_id:           broker.id,
          ghl_contact_id:      String(contact.id),
          full_name:           fullName,
          email:               contact.email ? String(contact.email) : null,
          phone:               contact.phone ? String(contact.phone) : null,
          plan_name:           fields.plan_name ?? null,
          carrier:             fields.carrier ?? 'unknown',
          mbi,
          status:              'ACTIVE',
          source:              'ghl_oauth',
          verification_status: 'unverified',
          updated_at:          new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (records.length > 0) {
      const { error } = await supabase
        .from('ghl_contacts')
        .upsert(records, { onConflict: 'ghl_contact_id,agency_id', ignoreDuplicates: false });

      if (error) console.error('[ghl/callback] upsert error:', error);
      else synced = records.length;
    }
  } catch (err) {
    console.error('[ghl/callback] contact sync error:', err);
    // Non-fatal — tokens are saved, sync can retry
  }

  return NextResponse.redirect(
    new URL(`/dashboard?ghl=connected&synced=${synced}`, req.url)
  );
}
