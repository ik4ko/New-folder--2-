import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
      typescript: true,
    })
  }
  return _stripe
}

// ── Pricing constants — single source of truth ────────────────────────────────
// Keep in sync with page.tsx billing constants and pricing strategy doc.
export const PRICING = {
  broker: {
    monthly:       150,
    annual:        120,
    annualTotal:   1_440,
    annualSavings:   360,
  },
  agency: {
    monthly:          749,
    annual:           599,
    annualTotal:    7_188,
    annualSavings:  1_800,
    includedSeats:      5,
    extraSeatMonthly:  49,
    extraSeatAnnual:   39,
  },
} as const

// ── Plan configuration ────────────────────────────────────────────────────────
export const PLANS = {
  broker: {
    name:            'Solo Broker Plan',
    priceId:         process.env.STRIPE_BROKER_PRICE_ID ?? '',
    tier:            'broker'  as const,
    monthlyPrice:    PRICING.broker.monthly,
    annualPrice:     PRICING.broker.annual,
    seatLimit:       1,
    includedSeats:   1,
    overageBilled:   false,
    description:     '1 broker seat · Full platform access · Cancel anytime',
    trialPeriodDays: 0,  // NO free trials — explicitly zero
  },
  agency: {
    name:                'Agency Plan',
    priceId:             process.env.STRIPE_AGENCY_PRICE_ID ?? '',
    seatAddonPriceId:    process.env.STRIPE_SEAT_ADDON_PRICE_ID ?? '',
    tier:                'agency'  as const,
    monthlyPrice:        PRICING.agency.monthly,
    annualPrice:         PRICING.agency.annual,
    seatLimit:           null,   // null = unlimited (metered via Stripe)
    includedSeats:       PRICING.agency.includedSeats,
    overageBilled:       true,
    extraSeatMonthly:    PRICING.agency.extraSeatMonthly,
    extraSeatAnnual:     PRICING.agency.extraSeatAnnual,
    description:         '5 broker seats included · Silent Owner Dashboard · GHL multi-routing',
    trialPeriodDays:     0,      // NO free trials — explicitly zero
  },
} as const

export type PlanKey = keyof typeof PLANS

/**
 * Resolve a Stripe Price ID to its tier plan configuration.
 * Returns null when the price ID doesn't match any known plan.
 */
export function resolvePlanByPriceId(priceId: string): (typeof PLANS)[PlanKey] | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) return plan
  }
  return null
}

/**
 * Map a subscription tier string to its seat enforcement rules.
 * Used by the webhook to update agencies.seat_limit atomically with tier.
 */
export function getSeatRulesForTier(tier: string): {
  seatLimit:     number | null
  includedSeats: number
} {
  switch (tier) {
    case 'broker':
      return { seatLimit: 1, includedSeats: 1 }
    case 'agency':
      return { seatLimit: null, includedSeats: PRICING.agency.includedSeats }
    default:
      return { seatLimit: 1, includedSeats: 1 }  // trial defaults to Solo rules
  }
}
