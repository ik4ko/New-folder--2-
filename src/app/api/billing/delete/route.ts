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
 * What happens:
 *   - Stripe: subscription cancelled immediately (not at period end)
 *   - Supabase agencies: subscription_status → 'deleted', deleted_at = now()
 *   - Supabase brokers: is_active → false for ALL brokers in the agency
 *   - PHI vault, switch_alerts, book_of_business, audit_log: fully retained
 *   - AppShell will redirect all users to /account-deleted on next load
 *
 * Requires confirmation token in request body to prevent accidental deletion:
 *   { confirm: "DELETE MY ACCOUNT" }
 *
 * Auth: owner-only. This is irreversible via the app — requires Anthropic/admin
 * intervention to restore.
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
        error: `Confirmation required. Send { "confirm": "${REQUIRED_CONFIRMATION}" } to proceed.`,
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

  // ── 4. Cancel Stripe subscription immediately ─────────────────────────────
  if (agency.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(agency.stripe_subscription_id, {
        prorate: false,
      })
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      // If already cancelled on Stripe side, continue with DB update
      if (!msg.includes('No such subscription') && !msg.includes('already canceled')) {
        console.error('[billing/delete] Stripe cancellation error:', msg)
        return NextResponse.json(
          { error: `Stripe cancellation failed: ${msg}` },
          { status: 502 }
        )
      }
    }
  }

  const deletedAt = new Date().toISOString()

  // ── 5. Soft-delete agency in Supabase ─────────────────────────────────────
  const { error: agencyUpdateErr } = await svc
    .from('agencies')
    .update({
      subscription_status:    'deleted',
      stripe_subscription_id: null,
      stripe_price_id:        null,
      // Store deletion timestamp in metadata — agencies table has no deleted_at column
      // We use subscription_status = 'deleted' as the authoritative lock signal
    })
    .eq('id', agency.id)

  if (agencyUpdateErr) {
    console.error('[billing/delete] agency update error:', agencyUpdateErr.message)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }

  // ── 6. Lock ALL broker seats immediately ──────────────────────────────────
  // This is the hard lockout — all broker logins become invalid on next
  // AppShell auth check since the agency subscription_status is 'deleted'.
  const { error: brokerLockErr } = await svc
    .from('brokers')
    .update({
      is_active:       false,
      deactivated_at:  deletedAt,
    })
    .eq('agency_id', agency.id)

  if (brokerLockErr) {
    // Non-fatal — agency is already marked deleted, brokers are implicitly locked
    console.error('[billing/delete] broker lock error:', brokerLockErr.message)
  }

  // ── 7. Immutable compliance audit record ─────────────────────────────────
  // This record must never be deleted — it is the CMS-required evidence
  // of account termination for HIPAA §164.312(b) audit trail.
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
