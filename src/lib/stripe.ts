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

export const PLANS = {
  broker: {
    name: 'Broker',
    priceId: process.env.STRIPE_BROKER_PRICE_ID ?? '',
    tier: 'broker' as const,
    price: 49,
    description: 'Solo broker — up to 3 admin seats',
  },
  agency: {
    name: 'Agency',
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? '',
    tier: 'agency' as const,
    price: 99,
    description: 'Full agency — unlimited brokers',
  },
} as const

export type PlanKey = keyof typeof PLANS
