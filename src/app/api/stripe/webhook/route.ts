import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// Stripe requires the raw body for signature verification -- disable body parsing
export const dynamic = 'force-dynamic'

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = req.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await getRawBody(req)
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const agencyId = session.metadata?.agency_id
        const plan = session.metadata?.plan
        if (!agencyId) break

        const tier = plan === 'broker' ? 'broker' : plan === 'agency' ? 'agency' : 'agency'

        await supabase.from('agencies').update({
          subscription_status: 'active',
          subscription_tier: tier,
          stripe_subscription_id: session.subscription as string,
        }).eq('id', agencyId)

        await insertBillingEvent(supabase, agencyId, event.id, event.type, null, 'succeeded', {
          session_id: session.id,
          plan,
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: agency } = await supabase
          .from('agencies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (!agency) break

        const periodEnd = (invoice as any).lines?.data?.[0]?.period?.end
        await supabase.from('agencies').update({
          subscription_status: 'active',
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
        }).eq('id', agency.id)

        await insertBillingEvent(supabase, agency.id, event.id, event.type,
          invoice.amount_paid, 'succeeded', { invoice_id: invoice.id })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: agency } = await supabase
          .from('agencies').select('id').eq('stripe_customer_id', customerId).maybeSingle()
        if (!agency) break

        await supabase.from('agencies').update({ subscription_status: 'past_due' }).eq('id', agency.id)
        await insertBillingEvent(supabase, agency.id, event.id, event.type,
          invoice.amount_due, 'failed', { invoice_id: invoice.id })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const { data: agency } = await supabase
          .from('agencies').select('id').eq('stripe_customer_id', customerId).maybeSingle()
        if (!agency) break

        await supabase.from('agencies').update({
          subscription_status: 'cancelled',
          stripe_subscription_id: null,
        }).eq('id', agency.id)

        await insertBillingEvent(supabase, agency.id, event.id, event.type,
          null, 'cancelled', { subscription_id: sub.id })
        break
      }

      default:
        // Unhandled event -- acknowledge receipt so Stripe doesn't retry
        break
    }
  } catch (err: any) {
    console.error(`[webhook] error handling ${event.type}:`, err)
    // Return 200 anyway so Stripe doesn't keep retrying -- log the error instead
  }

  return NextResponse.json({ received: true })
}

async function insertBillingEvent(
  supabase: ReturnType<typeof createServiceClient>,
  agencyId: string,
  stripeEventId: string,
  eventType: string,
  amountCents: number | null,
  status: string,
  metadata: Record<string, unknown>,
) {
  await supabase.from('billing_events').upsert({
    agency_id: agencyId,
    stripe_event_id: stripeEventId,
    event_type: eventType,
    amount_cents: amountCents,
    status,
    metadata,
  }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
}
