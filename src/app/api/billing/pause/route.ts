/**
 * POST /api/billing/pause
 *
 * Pauses Stripe billing collection for the agency subscription.
 * Stripe continues the subscription (no cancellation) but stops generating
 * invoices until resumed. All data and broker seats are fully retained.
 *
 * Behaviour:
 *   - Stripe: pause_collection = { behavior: 'void' }
 *   - Supabase: subscription_status → 'paused'
 *   - Broker access is suspended at the AppShell auth-check level
 *   - Data: fully retained, no records modified
 *   - Resume: requires support contact (intentional — prevents accidental resume)
 *
 * Auth: owner-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe }           from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Resolve agency ────────────────────────────────────────────────────
  const svc = createServiceClient()
  const { data: agency } = await svc
    .from('agencies')
    .select('id, stripe_subscription_id, subscription_status, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'No agency found for this account' }, { status: 404 })
  }

  if (agency.subscription_status === 'paused') {
    return NextResponse.json({ error: 'Account is already paused' }, { status: 409 })
  }

  if (agency.subscription_status === 'cancelled' || agency.subscription_status === 'deleted') {
    return NextResponse.json(
      { error: 'Account is already cancelled or deleted' },
      { status: 422 }
    )
  }

  // ── 3. Pause collection on Stripe ────────────────────────────────────────
  if (agency.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.update(
        agency.stripe_subscription_id,
        { pause_collection: { behavior: 'void' } }
      )
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      console.error('[billing/pause] Stripe error:', msg)
      return NextResponse.json(
        { error: `Stripe pause failed: ${msg}` },
        { status: 502 }
      )
    }
  }

  // ── 4. Mark in Supabase ───────────────────────────────────────────────────
  const { error: updateErr } = await svc
    .from('agencies')
    .update({ subscription_status: 'paused' })
    .eq('id', agency.id)

  if (updateErr) {
    console.error('[billing/pause] Supabase update error:', updateErr.message)
    return NextResponse.json(
      { error: 'Failed to update account status' },
      { status: 500 }
    )
  }

  // ── 5. Audit log ─────────────────────────────────────────────────────────
  await svc.from('audit_log').insert({
    agency_id:     agency.id,
    user_id:       user.id,
    action:        'ACCOUNT_PAUSED',
    resource_type: 'agencies',
    resource_id:   agency.id,
    metadata: {
      agency_name:     agency.name,
      stripe_sub_id:   agency.stripe_subscription_id ?? null,
      previous_status: agency.subscription_status,
    },
  })

  return NextResponse.json({
    success: true,
    status:  'paused',
    message: 'Account paused. All broker access is suspended. Contact support to resume.',
  })
}
