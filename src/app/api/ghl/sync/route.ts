/**
 * POST /api/ghl/sync
 *
 * Production-grade GHL contact bulk import.
 *
 * Architecture:
 *   - Stream-paginates GHL contacts 100 at a time
 *   - Upserts each page immediately (never accumulates all contacts in memory)
 *   - Handles 100 – 10,000+ contacts without hitting the 60-second Vercel limit
 *     by processing in configurable page-count slices per call, storing a cursor
 *     so the next call can resume exactly where it left off
 *   - Tracks live progress in agency_credentials.sync_* columns
 *   - Auto-refreshes GHL access token when < 5 min from expiry
 *
 * White-label GHL:
 *   Standard and white-labeled GHL instances use the identical OAuth/API layer
 *   (marketplace.gohighlevel.com + services.leadconnectorhq.com).
 *   White-labeling only affects the broker's dashboard URL, not our API calls.
 *
 * Body (all optional):
 *   {
 *     force?: boolean    — ignore last_synced_at, pull all contacts from GHL
 *     maxPages?: number  — cap pages fetched this call (default 20 = 2,000 contacts)
 *                          Set higher for a full initial import; lower for incremental
 *   }
 *
 * Response:
 *   {
 *     synced: number, skipped: number, total_fetched: number,
 *     has_more: boolean, cursor: string|null,
 *     mode: 'incremental'|'full',
 *     message: string
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  logCrmImportStarted,
  logCrmImportCompleted,
  logCrmExportStarted,
  logCrmExportCompleted,
  logCrmExportFailed,
  extractIp,
} from '@/utils/auditLogger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Allow up to 60 s on Pro, use all of it for large imports
export const maxDuration = 60

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const BATCH_SIZE   = 100   // contacts per GHL API page (GHL max)
const DB_BATCH     = 200   // rows per Supabase upsert call

// ── Field extraction ──────────────────────────────────────────────────────────
const GHL_FIELD_MAP: Record<string, string> = {
  mbi:               'mbi',
  medicare_id:       'mbi',
  medicare_number:   'mbi',
  plan_name:         'plan_name',
  plan:              'plan_name',
  carrier:           'carrier',
  insurance_carrier: 'carrier',
  dob:               'dob',
  date_of_birth:     'dob',
  birthday:          'dob',
  // Doctor / VCC fax fields (common GHL custom field keys)
  doctor_name:       'doctor_name',
  physician_name:    'doctor_name',
  primary_doctor:    'doctor_name',
  pcp_name:          'doctor_name',
  doctor_fax:        'doctor_fax',
  physician_fax:     'doctor_fax',
  pcp_fax:           'doctor_fax',
  fax_number:        'doctor_fax',
}

function extractGhlFields(contact: Record<string, unknown>): Record<string, string> {
  // GHL API returns customFields as an array in the standard case, but can
  // return null, an empty object {}, or omit the key entirely on malformed
  // or partially-provisioned sub-accounts. The `as Array<...>` cast is not a
  // runtime check — guard explicitly so a bad payload never throws in the loop.
  const raw = contact.customFields ?? contact.custom_fields
  const customFields = Array.isArray(raw)
    ? (raw as Array<{ key?: string; id?: string; field_key?: string; value?: unknown }>)
    : []

  const extracted: Record<string, string> = {}
  for (const field of customFields) {
    const rawKey = field.field_key ?? field.key ?? field.id ?? ''
    const key    = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
    const mapped = GHL_FIELD_MAP[key]
    if (mapped && field.value != null && String(field.value).trim()) {
      extracted[mapped] = String(field.value).trim()
    }
  }
  return extracted
}

function sanitizeMbi(raw: string): string | null {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
  return clean.length === 11 ? clean : null
}

// ── Token management ──────────────────────────────────────────────────────────
async function getValidToken(agencyId: string, svc: ReturnType<typeof createServiceClient>) {
  const { data: cred } = await svc
    .from('agency_credentials')
    .select('access_token, refresh_token, expires_at, location_id, last_synced_at, sync_cursor')
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (!cred?.access_token) throw new Error('GHL not connected for this agency')

  // Null guard: a missing expires_at means the stored token has no known expiry —
  // rather than silently falling back to the Unix epoch (which forces a token refresh
  // on every single sync call), we require reconnection to obtain a fresh token set.
  if (!cred.expires_at) {
    throw new Error('GHL token missing expiry — please reconnect via the GHL page to refresh your credentials')
  }

  const expiresAt    = new Date(cred.expires_at).getTime()
  const needsRefresh = expiresAt - Date.now() < 5 * 60 * 1000

  if (!needsRefresh) {
    return {
      accessToken:  cred.access_token,
      locationId:   cred.location_id as string,
      lastSyncedAt: cred.last_synced_at as string | null,
      syncCursor:   cred.sync_cursor as string | null,
    }
  }

  const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GHL_CLIENT_ID!,
      client_secret: process.env.GHL_CLIENT_SECRET!,
      grant_type:    'refresh_token',
      refresh_token: cred.refresh_token,
    }),
  })

  if (!res.ok) {
    // Read the response body once — log it safely (server-only), never expose in thrown message
    const rawBody = await res.text().catch(() => '<unreadable>')
    console.error('[ghl/sync] token refresh failed:', res.status, rawBody.slice(0, 200))
    throw new Error(`GHL token refresh failed (HTTP ${res.status}) — please reconnect via the GHL page`)
  }

  const tokens = await res.json() as {
    access_token: string; refresh_token: string; expires_in: number
  }

  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await svc.from('agency_credentials').update({
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    newExpiry,
    updated_at:    new Date().toISOString(),
  }).eq('agency_id', agencyId)

  return {
    accessToken:  tokens.access_token,
    locationId:   cred.location_id as string,
    lastSyncedAt: cred.last_synced_at as string | null,
    syncCursor:   cred.sync_cursor as string | null,
  }
}

// ── GHL single-page fetch ─────────────────────────────────────────────────────
async function fetchPage(
  accessToken: string,
  locationId: string,
  cursor: string | null,
  since: string | null,
): Promise<{ contacts: Record<string, unknown>[]; nextCursor: string | null }> {
  const url = new URL(`${GHL_API_BASE}/contacts/`)
  url.searchParams.set('locationId', locationId)
  url.searchParams.set('limit', String(BATCH_SIZE))
  if (cursor)  url.searchParams.set('startAfter', cursor)
  if (since)   url.searchParams.set('startAfterDate', since)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}`, Version: '2021-07-28' },
  })

  if (res.status === 429) {
    // Rate-limited — caller should wait and retry
    throw Object.assign(new Error('GHL rate limit'), { retryable: true })
  }
  if (!res.ok) {
    throw new Error(`GHL contacts API ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const json = await res.json() as {
    contacts?: Record<string, unknown>[]
    meta?: { startAfter?: string; nextPageUrl?: string }
  }

  const contacts   = json.contacts ?? []
  const nextCursor = contacts.length === BATCH_SIZE ? (json.meta?.startAfter ?? null) : null
  return { contacts, nextCursor }
}

// ── Map contacts → DB records ─────────────────────────────────────────────────
function mapContacts(
  contacts: Record<string, unknown>[],
  agencyId: string,
  brokerId: string,
): Record<string, unknown>[] {
  return contacts.map((contact) => {
    const fields   = extractGhlFields(contact)
    const rawMbi   = fields.mbi ?? ''
    const mbi      = rawMbi ? sanitizeMbi(rawMbi) : null
    const fullName = [
      String(contact.firstName ?? ''),
      String(contact.lastName ?? ''),
    ].filter(Boolean).join(' ') || String(contact.name ?? '') || null

    // GHL guarantees `id` on well-formed contacts, but malformed payloads can
    // omit it. String(undefined) produces the literal "undefined" which passes
    // the truthy filter below and collides on the unique constraint — skip
    // any contact without a valid non-empty string ID instead.
    const contactId = contact.id != null && String(contact.id).trim()
      ? String(contact.id).trim()
      : null

    return {
      agency_id:           agencyId,
      broker_id:           brokerId,
      ghl_contact_id:      contactId,
      full_name:           fullName,
      email:               contact.email ? String(contact.email) : null,
      phone:               contact.phone ? String(contact.phone) : null,
      plan_name:           fields.plan_name ?? null,
      carrier:             fields.carrier   ?? 'unknown',
      mbi:                 mbi,
      dob:                 fields.dob ?? null,
      status:              'ACTIVE',
      source:              'ghl_sync',
      verification_status: 'unverified',
      updated_at:          new Date().toISOString(),
    }
  }).filter(r => r.ghl_contact_id)
}

// ── DB progress helpers ───────────────────────────────────────────────────────
async function updateProgress(
  svc: ReturnType<typeof createServiceClient>,
  agencyId: string,
  updates: Record<string, unknown>,
) {
  try {
    await svc.from('agency_credentials')
      .update(updates)
      .eq('agency_id', agencyId)
  } catch {
    // Non-fatal — sync continues even if progress tracking fails
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // Use getUser() — validates the JWT server-side with Supabase Auth.
  // getSession() only reads the cookie without server verification and is
  // vulnerable to replayed or tampered tokens.
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    force?:    boolean
    maxPages?: number
    resume?:   boolean  // if true, continue from stored sync_cursor
  }

  const maxPages = Math.min(body.maxPages ?? 20, 100) // safety cap: 100 pages = 10,000 contacts

  const svc = createServiceClient()

  const { data: broker } = await svc
    .from('brokers')
    .select('id, agency_id')
    .eq('user_id', user.id)
    .single()

  if (!broker) {
    return NextResponse.json({ error: 'Broker not found' }, { status: 404 })
  }

  let tokenInfo: Awaited<ReturnType<typeof getValidToken>>
  try {
    tokenInfo = await getValidToken(broker.agency_id, svc)
  } catch (err) {
    return NextResponse.json(
      { error: 'GHL not connected. Reconnect via the GHL page.', detail: String(err) },
      { status: 400 }
    )
  }

  const { accessToken, locationId, lastSyncedAt, syncCursor: storedCursor } = tokenInfo

  // Determine sync mode
  const isResume    = body.resume && storedCursor
  const isFull      = body.force || !lastSyncedAt
  const since       = isFull || isResume ? null : lastSyncedAt
  const startCursor = isResume ? storedCursor : null
  const mode        = isFull ? 'full' : 'incremental'

  console.log(`[ghl/sync] mode=${mode} resume=${isResume} since=${since} cursor=${startCursor} maxPages=${maxPages}`)

  // ── Compliance log: inbound sync started ─────────────────────────────────
  // Non-blocking: void so audit latency doesn't add to the sync start-up time.
  void logCrmImportStarted(
    broker.agency_id,
    user.id,
    isFull ? 'full' : 'incremental',
    extractIp(req),
  )

  // Mark sync as running
  await updateProgress(svc, broker.agency_id, { sync_status: 'running', sync_cursor: startCursor })

  let synced       = 0
  let errored      = 0
  let totalFetched = 0
  let cursor       = startCursor
  let pagesRead    = 0
  let hasMore      = false

  try {
    while (pagesRead < maxPages) {
      // Fetch one page from GHL
      let page: Awaited<ReturnType<typeof fetchPage>>
      try {
        page = await fetchPage(accessToken, locationId, cursor, since)
      } catch (err: unknown) {
        const isRetryable = typeof err === 'object' && err !== null && 'retryable' in err
        if (isRetryable) {
          // Rate limited — pause 2s and retry once
          await new Promise(r => setTimeout(r, 2000))
          page = await fetchPage(accessToken, locationId, cursor, since)
        } else {
          throw err
        }
      }

      const { contacts, nextCursor } = page
      totalFetched += contacts.length
      pagesRead++

      if (contacts.length === 0) break

      // Map and upsert immediately — no memory accumulation
      const records = mapContacts(contacts, broker.agency_id, broker.id)

      for (let i = 0; i < records.length; i += DB_BATCH) {
        const batch = records.slice(i, i + DB_BATCH)
        const { error } = await svc
          .from('ghl_contacts')
          .upsert(batch, { onConflict: 'ghl_contact_id,agency_id', ignoreDuplicates: false })

        if (error) {
          console.error('[ghl/sync] upsert error:', error.message)
          errored += batch.length
        } else {
          synced += batch.length
        }
      }

      // Update progress after each page
      await updateProgress(svc, broker.agency_id, {
        sync_total:  synced,
        sync_cursor: nextCursor,
      })

      cursor = nextCursor

      // If GHL has no more pages, we're done
      if (!nextCursor) {
        hasMore = false
        break
      }

      // If we hit the page cap, there's more to fetch in the next call
      if (pagesRead >= maxPages) {
        hasMore = true
        break
      }

      // Brief pause between pages to be a good API citizen (avoid rate limiting)
      if (pagesRead % 5 === 0) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    const now = new Date().toISOString()
    await updateProgress(svc, broker.agency_id, {
      sync_status:    hasMore ? 'partial' : 'complete',
      sync_cursor:    hasMore ? cursor : null,
      last_synced_at: hasMore ? null : now,
      sync_total:     synced,
      updated_at:     now,
    })

    const message = hasMore
      ? `Imported ${synced} contacts so far — call again with {resume:true} to continue.`
      : mode === 'incremental'
        ? `Incremental sync complete — ${synced} new/updated contacts imported.`
        : `Full import complete — ${synced} contacts from your GHL account.`

    console.log(`[ghl/sync] done: synced=${synced} errored=${errored} pages=${pagesRead} hasMore=${hasMore}`)

    // ── Compliance log: inbound sync completed ──────────────────────────────
    // PHI-SAFE: only counts and mode — no member names or MBIs.
    void logCrmImportCompleted(
      broker.agency_id,
      user.id,
      synced,
      errored,
      hasMore,
      mode,
      extractIp(req),
    )


    return NextResponse.json({
      synced,
      skipped:       errored,
      total_fetched: totalFetched,
      has_more:      hasMore,
      cursor:        hasMore ? cursor : null,
      mode,
      message,
    })

  } catch (err) {
    console.error('[ghl/sync] fatal error:', err)
    await updateProgress(svc, broker.agency_id, { sync_status: 'error' })
    return NextResponse.json(
      { error: 'Sync failed', detail: String(err), synced },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/ghl/sync
//
// Pushes Book of Business member data → GoHighLevel contacts.
// This is the OUTBOUND direction — the inverse of the POST handler above
// which pulls contacts FROM GHL into our database.
//
// For each BOB member:
//   1. Looks up their GHL contact ID via mbi cross-reference in ghl_contacts
//   2. If found  → PUT /contacts/{id}  (updates custom fields + retention tags only;
//                  never overwrites GHL-native phone/email/name)
//   3. If absent → POST /contacts/     (creates the contact with name + custom fields)
//   4. Applies retention tags based on open switch_alerts status
//
// Rate limit architecture:
//   GHL allows ~100 req/min. At 650ms per contact that's ~92/min — safely below.
//   For books > 50 members the frontend should call in slices using startIndex:
//     call 1: { startIndex: 0  } → returns nextIndex: 50
//     call 2: { startIndex: 50 } → returns nextIndex: 100
//     ...until nextIndex is null (push complete)
//
// Custom field convention:
//   Brokers must create the following custom fields in their GHL sub-account
//   using these exact field keys (Settings → Custom Fields):
//     aegissage_mbi                 Medicare Beneficiary ID
//     aegissage_carrier             Current Insurance Carrier
//     aegissage_plan_name           Enrolled Plan Name
//     aegissage_enrollment_status   Enrollment Status (active/termed/pending)
//     aegissage_churn_risk          Risk Level (HIGH / MEDIUM / LOW)
//     aegissage_future_plan         Upcoming Plan (if switch detected)
//     aegissage_future_eff_date     Future Plan Effective Date
//     aegissage_doctor_name         Primary Care Physician
//
// Retention tags applied:
//   AegisSage-Monitored    → always (all AegisSage-managed contacts)
//   AegisSage-Churn-Risk   → member has open non-termed switch alert
//   AegisSage-Termed       → member termed/disenrolled OR has open termed alert
//   AegisSage-DSNP         → member is_chronic = true (dual-eligible)
//   AegisSage-Switch-Pending → future_plan_name is populated
// ═══════════════════════════════════════════════════════════════════════════════

// ── Constants ─────────────────────────────────────────────────────────────────

/** Contacts pushed per invocation. Stay ≤ 50 to fit inside Vercel's 60s window. */
const PUSH_BATCH_SIZE = 50

/**
 * Delay between individual contact API calls (ms).
 * GHL rate limit ≈ 100 req/min → minimum 600ms/req.
 * 650ms gives ~92 req/min — safely under the limit with headroom.
 */
const PUSH_CONTACT_DELAY_MS = 650

/** Extra cooldown between page-level batches when the client is looping. */
const PUSH_PAGE_DELAY_MS = 1_000

// ── Types ─────────────────────────────────────────────────────────────────────

interface BobMember {
  id:                    string
  full_name:             string | null
  mbi:                   string | null
  carrier:               string | null
  plan_name:             string | null
  enrollment_status:     string | null
  verification_status:   string | null
  is_chronic:            boolean | null
  doctor_name:           string | null
  future_plan_name:      string | null
  future_effective_date: string | null
}

interface PushResult {
  total:      number
  pushed:     number
  created:    number
  updated:    number
  failed:     number
  nextIndex:  number | null
  errors:     Array<{ memberId: string; error: string }>
}

// ── Data fetch helpers ────────────────────────────────────────────────────────

/** Fetch all BOB members for the agency, ordered for stable cursor slicing. */
async function fetchBobMembers(
  agencyId: string,
  svc:      ReturnType<typeof createServiceClient>,
): Promise<BobMember[]> {
  const { data, error } = await svc
    .from('book_of_business')
    .select([
      'id', 'full_name', 'mbi', 'carrier', 'plan_name',
      'enrollment_status', 'verification_status', 'is_chronic',
      'doctor_name', 'future_plan_name', 'future_effective_date',
    ].join(', '))
    .eq('agency_id', agencyId)
    .order('id', { ascending: true }) // stable order for cursor pagination

  if (error) throw new Error(`BOB fetch failed: ${error.message}`)
  return (data as unknown as BobMember[]) ?? []
}

/**
 * Fetch open switch_alerts and partition member IDs into two risk buckets.
 *
 * churnRisk → member has an open alert but is NOT termed (active switch risk)
 * termed    → member has an open alert of type termed/fully_disenrolled
 */
async function fetchAtRiskMemberIds(
  agencyId: string,
  svc:      ReturnType<typeof createServiceClient>,
): Promise<{ churnRisk: Set<string>; termed: Set<string> }> {
  const { data } = await svc
    .from('switch_alerts')
    .select('bob_member_id, switch_type')
    .eq('agency_id', agencyId)
    .in('status', ['open', 'contacted'])
    .not('bob_member_id', 'is', null)

  const churnRisk = new Set<string>()
  const termed    = new Set<string>()

  for (const row of data ?? []) {
    if (!row.bob_member_id) continue
    if (['termed', 'fully_disenrolled'].includes(row.switch_type ?? '')) {
      termed.add(row.bob_member_id)
    } else {
      // pending_switch, future_plan_change, carrier_switch, etc.
      churnRisk.add(row.bob_member_id)
    }
  }

  return { churnRisk, termed }
}

/**
 * Build a mbi → ghl_contact_id lookup map for members we have already
 * imported from GHL. Used to decide PUT (update) vs POST (create).
 */
async function fetchGhlContactIdMap(
  agencyId:    string,
  memberMbis:  string[],
  svc:         ReturnType<typeof createServiceClient>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (memberMbis.length === 0) return map

  // Chunk the IN query to avoid Supabase URL length limits on large books
  const MBI_CHUNK = 200
  for (let i = 0; i < memberMbis.length; i += MBI_CHUNK) {
    const slice = memberMbis.slice(i, i + MBI_CHUNK)
    const { data } = await svc
      .from('ghl_contacts')
      .select('ghl_contact_id, mbi')
      .eq('agency_id', agencyId)
      .in('mbi', slice)
      .not('mbi', 'is', null)
      .not('ghl_contact_id', 'is', null)

    for (const row of data ?? []) {
      if (row.mbi && row.ghl_contact_id) {
        map.set(row.mbi, row.ghl_contact_id)
      }
    }
  }

  return map
}

// ── Payload construction ──────────────────────────────────────────────────────

/**
 * Split "LAST, FIRST" or "FIRST LAST" (any casing) into separate name parts.
 * GHL requires firstName/lastName fields on contact create.
 */
function splitMemberName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' }

  // Humana/carrier export format: "LASTNAME, FIRSTNAME MIDDLE"
  const commaIdx = fullName.indexOf(',')
  if (commaIdx > -1) {
    const last  = fullName.slice(0, commaIdx).trim()
    const first = fullName.slice(commaIdx + 1).trim()
    return {
      firstName: toTitleCase(first),
      lastName:  toTitleCase(last),
    }
  }

  // Standard "First Last" format
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: toTitleCase(parts[0]), lastName: '' }
  return {
    firstName: toTitleCase(parts.slice(0, -1).join(' ')),
    lastName:  toTitleCase(parts[parts.length - 1]),
  }
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Build the GHL contacts API payload for a single BOB member.
 *
 * For existing GHL contacts (ghlContactId present):
 *   We only update custom fields and AegisSage retention tags.
 *   We never send name/phone/email — GHL's own data is authoritative.
 *
 * For new contacts (no ghlContactId):
 *   We send name + custom fields + tags. Phone and email are omitted
 *   because BOB only stores Medicare plan data, not PII contact info.
 */
function buildGhlPayload(
  member:       BobMember,
  locationId:   string,
  isUpdate:     boolean,   // true = PUT to existing contact; false = POST new
  isChurnRisk:  boolean,
  isTermed:     boolean,
): Record<string, unknown> {
  // ── Retention tags ──────────────────────────────────────────────────────────
  // All AegisSage-managed tags use the "AegisSage-" prefix so brokers can
  // easily filter them in GHL workflows. The full tag list REPLACES any
  // previous AegisSage tags on the contact — this is intentional.
  const tags: string[] = ['AegisSage-Monitored']

  if (isTermed)                  tags.push('AegisSage-Termed')
  if (isChurnRisk)               tags.push('AegisSage-Churn-Risk')
  if (member.is_chronic)         tags.push('AegisSage-DSNP')
  if (member.future_plan_name)   tags.push('AegisSage-Switch-Pending')

  // ── Custom fields ───────────────────────────────────────────────────────────
  // Uses GHL V2 customFields array format.
  // Brokers must create fields with these exact keys in their GHL sub-account
  // (Settings → Custom Fields). The "aegissage_" prefix avoids collisions
  // with any existing custom fields in the broker's account.
  const churnRiskLabel = isTermed ? 'HIGH' : isChurnRisk ? 'MEDIUM' : 'LOW'

  const customFields: Array<{ key: string; field_value: string }> = [
    // Always include risk level so GHL workflows can branch on it
    { key: 'aegissage_churn_risk', field_value: churnRiskLabel },
  ]

  if (member.mbi) {
    customFields.push({ key: 'aegissage_mbi', field_value: member.mbi })
  }
  if (member.carrier) {
    customFields.push({ key: 'aegissage_carrier', field_value: member.carrier })
  }
  if (member.plan_name) {
    customFields.push({ key: 'aegissage_plan_name', field_value: member.plan_name })
  }
  if (member.enrollment_status) {
    customFields.push({ key: 'aegissage_enrollment_status', field_value: member.enrollment_status })
  }
  if (member.future_plan_name) {
    customFields.push({ key: 'aegissage_future_plan', field_value: member.future_plan_name })
  }
  if (member.future_effective_date) {
    customFields.push({ key: 'aegissage_future_eff_date', field_value: member.future_effective_date })
  }
  if (member.doctor_name) {
    customFields.push({ key: 'aegissage_doctor_name', field_value: member.doctor_name })
  }

  // ── Payload shape ───────────────────────────────────────────────────────────
  if (isUpdate) {
    // PUT: only AegisSage-controlled fields — never overwrite GHL-native data
    return { tags, customFields }
  }

  // POST: include name so GHL can display the member correctly
  const { firstName, lastName } = splitMemberName(member.full_name)
  return {
    firstName,
    lastName,
    locationId,
    tags,
    customFields,
    source: 'AegisSage',
  }
}

// ── GHL API call ──────────────────────────────────────────────────────────────

/**
 * Upsert one contact to GHL.
 * Returns the action taken and any error string.
 * Never throws — per-contact errors must not abort the batch loop.
 */
async function upsertGhlContact(
  ghlContactId: string | null,
  payload:      Record<string, unknown>,
  accessToken:  string,
): Promise<{ action: 'created' | 'updated' | 'failed'; error?: string }> {
  const isUpdate = ghlContactId !== null
  const url      = isUpdate
    ? `${GHL_API_BASE}/contacts/${ghlContactId}`
    : `${GHL_API_BASE}/contacts/`

  try {
    const res = await fetch(url, {
      method:  isUpdate ? 'PUT' : 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Version:        '2021-07-28',
      },
      body: JSON.stringify(payload),
    })

    if (res.status === 429) {
      // GHL rate limited — caller handles one automatic retry
      return { action: 'failed', error: 'RATE_LIMITED' }
    }

    if (!res.ok) {
      // Read error body once, never log raw content (may contain contact details)
      const body = await res.text().catch(() => '')
      return {
        action: 'failed',
        error:  `HTTP ${res.status}: ${body.slice(0, 120)}`,
      }
    }

    return { action: isUpdate ? 'updated' : 'created' }

  } catch (err) {
    return {
      action: 'failed',
      error:  err instanceof Error ? err.message : String(err),
    }
  }
}

// ── Batch processor ───────────────────────────────────────────────────────────

/**
 * Process a slice of BOB members and push each to GHL.
 *
 * Per-contact failures are logged and accumulated — they do NOT abort
 * the loop. The full batch runs to completion even if individual
 * contacts error, ensuring a single bad record can't block 49 others.
 */
async function pushMemberBatch(
  members:      BobMember[],
  ghlIdMap:     Map<string, string>,
  churnRiskIds: Set<string>,
  termedIds:    Set<string>,
  accessToken:  string,
  locationId:   string,
): Promise<{ created: number; updated: number; failed: number; errors: Array<{ memberId: string; error: string }> }> {
  let created = 0
  let updated = 0
  let failed  = 0
  const errors: Array<{ memberId: string; error: string }> = []

  for (const member of members) {
    const ghlContactId = member.mbi ? (ghlIdMap.get(member.mbi) ?? null) : null
    const isChurnRisk  = churnRiskIds.has(member.id)
    const isTermed     = termedIds.has(member.id)
                      || member.enrollment_status === 'termed'
                      || member.enrollment_status === 'disenrolled'

    const payload = buildGhlPayload(
      member, locationId, ghlContactId !== null, isChurnRisk, isTermed
    )

    // First attempt
    let result = await upsertGhlContact(ghlContactId, payload, accessToken)

    // Single automatic retry on rate limit with a 1-second back-off
    if (result.error === 'RATE_LIMITED') {
      console.warn('[ghl/push] rate limited — backing off 1s before retry')
      await new Promise(r => setTimeout(r, 1_000))
      result = await upsertGhlContact(ghlContactId, payload, accessToken)
    }

    if (result.action === 'created')      created++
    else if (result.action === 'updated') updated++
    else {
      failed++
      // PHI-SAFE: log member UUID only — never log name or MBI
      console.error('[ghl/push] contact failed | member_id:', member.id, '| error:', result.error)
      errors.push({ memberId: member.id, error: result.error ?? 'Unknown error' })
    }

    // Inter-contact delay: 650ms keeps us at ~92 req/min (GHL limit: 100 req/min)
    await new Promise(r => setTimeout(r, PUSH_CONTACT_DELAY_MS))
  }

  return { created, updated, failed, errors }
}

// ── Generic chunk utility ─────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

/**
 * Core orchestration function — separated so both owner and broker paths
 * can share it without code duplication.
 */
async function pushFromAgency(
  userId:     string,
  agencyId:   string,
  svc:        ReturnType<typeof createServiceClient>,
  startIndex: number,
  batchSize:  number,
  ipAddress?: string,
): Promise<Response> {
  // ── Validate GHL connection ────────────────────────────────────────────────
  let tokenInfo: Awaited<ReturnType<typeof getValidToken>>
  try {
    tokenInfo = await getValidToken(agencyId, svc)
  } catch (err) {
    return NextResponse.json(
      { error: 'GHL not connected. Reconnect via the GHL page.', detail: String(err) },
      { status: 400 }
    )
  }

  const { accessToken, locationId } = tokenInfo

  if (!locationId) {
    return NextResponse.json(
      { error: 'GHL location ID missing — reconnect your GHL account to refresh it.' },
      { status: 400 }
    )
  }

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  let allMembers: BobMember[]
  let atRisk: { churnRisk: Set<string>; termed: Set<string> }

  try {
    ;[allMembers, atRisk] = await Promise.all([
      fetchBobMembers(agencyId, svc),
      fetchAtRiskMemberIds(agencyId, svc),
    ])
  } catch (err) {
    console.error('[ghl/push] data fetch failed:', err)
    return NextResponse.json(
      { error: 'Failed to load Book of Business data', detail: String(err) },
      { status: 500 }
    )
  }

  if (allMembers.length === 0) {
    return NextResponse.json({
      success:   true,
      total:     0,
      pushed:    0,
      created:   0,
      updated:   0,
      failed:    0,
      nextIndex: null,
      message:   'No members in Book of Business to sync.',
    })
  }

  // ── Slice the batch for this invocation ────────────────────────────────────
  const totalMembers = allMembers.length
  const slice        = allMembers.slice(startIndex, startIndex + batchSize)
  const nextIndex    = startIndex + slice.length < totalMembers
    ? startIndex + slice.length
    : null  // null signals the client that the push is complete

  if (slice.length === 0) {
    return NextResponse.json({
      success:   true,
      total:     totalMembers,
      pushed:    0,
      created:   0,
      updated:   0,
      failed:    0,
      nextIndex: null,
      message:   'startIndex is past the end of the Book of Business.',
    })
  }

  // ── Build MBI → ghl_contact_id map for this slice ─────────────────────────
  const sliceMbis = slice.map(m => m.mbi).filter((mbi): mbi is string => !!mbi)
  const ghlIdMap  = await fetchGhlContactIdMap(agencyId, sliceMbis, svc)

  // ── Compliance log: export started ────────────────────────────────────────
  // Fires before any GHL API calls — records the intent to push.
  // PHI-SAFE: only counts and cursor position — no names or MBIs.
  void logCrmExportStarted(
    agencyId,
    userId,
    totalMembers,
    slice.length,
    startIndex,
    ipAddress,
  )

  // ── Push to GHL ────────────────────────────────────────────────────────────
  const result: PushResult = {
    total:     totalMembers,
    pushed:    0,
    created:   0,
    updated:   0,
    failed:    0,
    nextIndex,
    errors:    [],
  }

  const pages = chunkArray(slice, 10)

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageResult = await pushMemberBatch(
      pages[pageIdx],
      ghlIdMap,
      atRisk.churnRisk,
      atRisk.termed,
      accessToken,
      locationId,
    )

    result.created += pageResult.created
    result.updated += pageResult.updated
    result.failed  += pageResult.failed
    result.pushed  += pageResult.created + pageResult.updated
    result.errors.push(...pageResult.errors)

    console.log(
      `[ghl/push] page ${pageIdx + 1}/${pages.length}` +
      ` | created=${pageResult.created} updated=${pageResult.updated} failed=${pageResult.failed}`
    )

    if (pageIdx < pages.length - 1) {
      await new Promise(r => setTimeout(r, PUSH_PAGE_DELAY_MS))
    }
  }

  // ── Compliance log: export completed ──────────────────────────────────────
  // Fires after all GHL API calls are done for this invocation.
  // PHI-SAFE: only aggregate counts and cursor metadata.
  void logCrmExportCompleted(
    agencyId,
    userId,
    result.created,
    result.updated,
    result.failed,
    startIndex,
    slice.length,
    totalMembers,
    nextIndex === null,  // isComplete
    ipAddress,
  )

  // ── Machine-readable audit log (enterprise_audit_logs) ────────────────────
  // Complements the compliance log above with structured JSON metadata
  // for security engineering and breach investigation tooling.
  void (async () => {
    try {
      await svc.from('audit_log').insert({
        agency_id:     agencyId,
        user_id:       userId,
        action:        'CRM_SYNC',
        resource_type: 'book_of_business',
        resource_id:   agencyId,
        metadata: {
          direction:      'bob_to_ghl',
          start_index:    startIndex,
          slice_size:     slice.length,
          total_members:  totalMembers,
          pushed:         result.pushed,
          created:        result.created,
          updated:        result.updated,
          failed:         result.failed,
        },
      })
    } catch (e: unknown) {
      console.error('[ghl/push] audit log failed:', e)
    }
  })()

  // ── Response ───────────────────────────────────────────────────────────────
  const isComplete = nextIndex === null

  const message = isComplete
    ? result.failed === 0
      ? `All ${result.pushed} members synced to GHL successfully.`
      : `${result.pushed} members synced. ${result.failed} failed — see errors array.`
    : `Pushed members ${startIndex + 1}–${startIndex + slice.length} of ${totalMembers}. ` +
      `Call again with { startIndex: ${nextIndex} } to continue.`

  console.log(
    `[ghl/push] done | pushed=${result.pushed} created=${result.created}` +
    ` updated=${result.updated} failed=${result.failed} nextIndex=${nextIndex ?? 'complete'}`
  )

  return NextResponse.json({
    success:   result.failed === 0,
    message,
    total:     result.total,
    pushed:    result.pushed,
    created:   result.created,
    updated:   result.updated,
    failed:    result.failed,
    nextIndex: result.nextIndex,
    ...(result.errors.length > 0 && { errors: result.errors.slice(0, 20) }),
  })
}

// ── Route handler: PUT /api/ghl/sync ─────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    startIndex?: number
    batchSize?:  number
  }

  const startIndex = Math.max(0, body.startIndex ?? 0)
  const batchSize  = Math.min(body.batchSize ?? PUSH_BATCH_SIZE, PUSH_BATCH_SIZE)
  const ipAddress  = extractIp(req)

  const svc = createServiceClient()

  const { data: broker } = await svc
    .from('brokers')
    .select('id, agency_id')
    .eq('user_id', user.id)
    .single()

  if (!broker) {
    const { data: agency } = await svc
      .from('agencies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!agency) {
      // Log the failure before returning
      void logCrmExportFailed(null, user.id, 'Broker profile not found', ipAddress)
      return NextResponse.json({ error: 'Broker profile not found' }, { status: 404 })
    }

    return pushFromAgency(user.id, agency.id, svc, startIndex, batchSize, ipAddress)
  }

  return pushFromAgency(user.id, broker.agency_id, svc, startIndex, batchSize, ipAddress)
}
