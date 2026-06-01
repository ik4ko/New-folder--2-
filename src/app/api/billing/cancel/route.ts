/**
 * POST /api/billing/cancel
 *
 * Schedules the Stripe subscription to cancel at the end of the current
 * billing period. The account remains fully active until current_period_end,
 * then degrades gracefully to read-only + locked state.
 *
 * Behaviour:
 *   - Stripe: cancel_at_period_end = true
 *   - Supabase: subscription_status → 'cancel_scheduled'
 *   - Account remains 100% operational until current_period_end
 *   - Stripe webhook (customer.subscription.deleted) handles final deactivation
 *     automatically when the period ends, setting status → 'cancelled'
 *
 * Auth: owner-only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe }           from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
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
    .select('id, stripe_subscription_id, subscription_status, current_period_end, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!agency) {
    return NextResponse.json({ error: 'No agency found for this account' }, { status: 404 })
  }

  if (agency.subscription_status === 'cancel_scheduled') {
    return NextResponse.json(
      { error: 'Cancellation is already scheduled', current_period_end: agency.current_period_end },
      { status: 409 }
    )
  }

  if (agency.subscription_status === 'cancelled' || agency.subscription_status === 'deleted') {
    return NextResponse.json(
      { error: 'Account is already cancelled or deleted' },
      { status: 422 }
    )
  }

  // ── 3. Schedule cancellation on Stripe ──────────────────────────────────
  let periodEnd: string | null = agency.current_period_end ?? null

  if (agency.stripe_subscription_id) {
    try {
      const updated = await getStripe().subscriptions.update(
        agency.stripe_subscription_id,
        { cancel_at_period_end: true }
      )
      // In Stripe API 2025-01-27.acacia, current_period_end moved from the
      // top-level Subscription to each SubscriptionItem. All plans have one item.
      const periodEndEpoch = updated.items.data[0]?.current_period_end
      if (periodEndEpoch) {
        periodEnd = new Date(periodEndEpoch * 1000).toISOString()
      }
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      console.error('[billing/cancel] Stripe error:', msg)
      return NextResponse.json(
        { error: `Stripe cancellation failed: ${msg}` },
        { status: 502 }
      )
    }
  }

  // ── 4. Mark in Supabase ───────────────────────────────────────────────────
  const { error: updateErr } = await svc
    .from('agencies')
    .update({
      subscription_status: 'cancel_scheduled',
      ...(periodEnd && { current_period_end: periodEnd }),
    })
    .eq('id', agency.id)

  if (updateErr) {
    console.error('[billing/cancel] Supabase update error:', updateErr.message)
    return NextResponse.json(
      { error: 'Failed to update account status' },
      { status: 500 }
    )
  }

  // ── 5. Audit log ─────────────────────────────────────────────────────────
  await svc.from('audit_log').insert({
    agency_id:     agency.id,
    user_id:       user.id,
    action:        'ACCOUNT_CANCEL_SCHEDULED',
    resource_type: 'agencies',
    resource_id:   agency.id,
    metadata: {
      agency_name:      agency.name,
      stripe_sub_id:    agency.stripe_subscription_id ?? null,
      previous_status:  agency.subscription_status,
      cancels_at:       periodEnd,
    },
  })

  return NextResponse.json({
    success:          true,
    status:           'cancel_scheduled',
    current_period_end: periodEnd,
    message:          `Account active until ${periodEnd ? new Date(periodEnd).toLocaleDateString() : 'end of billing period'}. No further charges will be made.`,
  })
}

// ── DELETE — undo a scheduled cancellation ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const { data: agency } = await svc
    .from('agencies')
    .select('id, stripe_subscription_id, subscription_status')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
  if (agency.subscription_status !== 'cancel_scheduled') {
    return NextResponse.json({ error: 'No scheduled cancellation to undo' }, { status: 409 })
  }

  if (agency.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.update(agency.stripe_subscription_id, {
        cancel_at_period_end: false,
      })
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      return NextResponse.json({ error: `Stripe reactivation failed: ${msg}` }, { status: 502 })
    }
  }

  await svc.from('agencies').update({ subscription_status: 'active' }).eq('id', agency.id)

  await svc.from('audit_log').insert({
    agency_id: agency.id, user_id: user.id,
    action: 'ACCOUNT_CANCEL_UNDONE', resource_type: 'agencies', resource_id: agency.id,
    metadata: { stripe_sub_id: agency.stripe_subscription_id ?? null },
  })

  return NextResponse.json({ success: true, status: 'active', message: 'Cancellation reversed. Your subscription will continue normally.' })
}
