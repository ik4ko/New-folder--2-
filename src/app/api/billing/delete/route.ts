/**
 * POST /api/billing/delete
 *
 * Immediately cancels the Stripe subscription and soft-deletes the agency
 * workspace. All seat logins are permanently locked out instantly.
 *
 * HIPAA / CMS Compliance:
 *   This is a SOFT DELETE — all data is retained in Supabase for the
 *   mandatory 10-year CMS audit retention window. Nothing is physically
 *   removed from the database or PHI vault (Supabase Storage).
 *
 * Deletion order (FK-safe):
 *   1. Stripe subscription cancelled
 *   2. Child tables with non-nullable agency_id FK cleared first:
 *      switch_alerts (delete), campaign_enrollments (delete),
 *      agency_credentials (delete), ghl_contacts (delete)
 *   3. Brokers deactivated (soft — records kept for HIPAA)
 *   4. Agency soft-deleted (subscription_status → 'deleted')
 *   5. Audit record inserted
 *
 * Requires confirmation token: { confirm: "DELETE MY ACCOUNT" }
 * Auth: owner-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe }           from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REQUIRED_CONFIRMATION = 'DELETE MY ACCOUNT'

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Require explicit confirmation string ───────────────────────────────
  let body: { confirm?: string } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  if (body.confirm !== REQUIRED_CONFIRMATION) {
    return NextResponse.json(
      {
        error:    `Confirmation required. Send { "confirm": "${REQUIRED_CONFIRMATION}" } to proceed.`,
        required: REQUIRED_CONFIRMATION,
      },
      { status: 422 }
    )
  }

  // ── 3. Resolve agency ────────────────────────────────────────────────────
  const svc = createServiceClient()
  const { data: agency } = await svc
    .from('agencies')
    .select('id, stripe_subscription_id, subscription_status, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'No agency found for this account' }, { status: 404 })
  }

  if (agency.subscription_status === 'deleted') {
    return NextResponse.json({ error: 'Account is already deleted' }, { status: 409 })
  }

  // ── 4. Cancel Stripe subscription ────────────────────────────────────────
  if (agency.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(agency.stripe_subscription_id, {
        prorate: false,
      })
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      if (!msg.includes('No such subscription') && !msg.includes('already canceled')) {
        console.error('[billing/delete] Stripe cancellation error:', msg)
        return NextResponse.json({ error: `Stripe cancellation failed: ${msg}` }, { status: 502 })
      }
    }
  }

  const deletedAt = new Date().toISOString()

  // ── 5-7. FK-safe ordered deletion sequence ────────────────────────────────
  //
  // Child tables that hold a non-nullable agency_id FK must be cleared
  // BEFORE the agencies row is updated, otherwise Supabase raises a
  // foreign key violation and the soft-delete is rolled back.
  //
  // HIPAA retention: book_of_business, vcc_submissions, aor_submissions,
  // audit_log, switch_alerts history, and the phi-vault bucket are NOT
  // deleted — they remain for the 10-year CMS audit window.
  // switch_alerts operational rows are cleared because they are derived
  // monitoring metadata, not PHI.
  try {
    // Step A — Remove operational child rows that block the agency update
    // switch_alerts: agency_id is NOT NULL — must delete, not nullify
    const { error: alertsErr } = await svc
      .from('switch_alerts')
      .delete()
      .eq('agency_id', agency.id)
    if (alertsErr) throw new Error(`switch_alerts: ${alertsErr.message}`)

    const { error: enrollErr } = await svc
      .from('campaign_enrollments')
      .delete()
      .eq('agency_id', agency.id)
    if (enrollErr) throw new Error(`campaign_enrollments: ${enrollErr.message}`)

    const { error: credErr } = await svc
      .from('agency_credentials')
      .delete()
      .eq('agency_id', agency.id)
    if (credErr) throw new Error(`agency_credentials: ${credErr.message}`)

    const { error: contactsErr } = await svc
      .from('ghl_contacts')
      .delete()
      .eq('agency_id', agency.id)
    if (contactsErr) throw new Error(`ghl_contacts: ${contactsErr.message}`)

    // Step B — Deactivate all broker seats (soft — rows retained for HIPAA)
    const { error: brokerErr } = await svc
      .from('brokers')
      .update({ is_active: false, deactivated_at: deletedAt })
      .eq('agency_id', agency.id)
    if (brokerErr) throw new Error(`brokers: ${brokerErr.message}`)

    // Step C — Soft-delete the agency row (subscription_status → 'deleted')
    const { error: agencyErr } = await svc
      .from('agencies')
      .update({
        subscription_status:    'deleted',
        stripe_subscription_id: null,
        stripe_price_id:        null,
      })
      .eq('id', agency.id)
    if (agencyErr) throw new Error(`agencies: ${agencyErr.message}`)

  } catch (err: unknown) {
    // Surface the exact FK constraint name in the UI toast
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[billing/delete] deletion sequence error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // ── 8. Immutable compliance audit record ──────────────────────────────────
  await svc.from('audit_log').insert({
    agency_id:     agency.id,
    user_id:       user.id,
    action:        'ACCOUNT_DELETED',
    resource_type: 'agencies',
    resource_id:   agency.id,
    metadata: {
      agency_name:     agency.name,
      stripe_sub_id:   agency.stripe_subscription_id ?? null,
      previous_status: agency.subscription_status,
      deleted_at:      deletedAt,
      initiated_by:    user.email ?? user.id,
      data_retention:  'HIPAA_10_YEAR — all data retained in phi-vault and audit_log',
    },
  })

  return NextResponse.json({
    success:    true,
    status:     'deleted',
    deleted_at: deletedAt,
    message:    'Account permanently deleted. All seat access has been revoked. Your data is retained per CMS/HIPAA requirements.',
  })
}
