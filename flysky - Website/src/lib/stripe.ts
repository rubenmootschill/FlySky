import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe() {
  if (_stripe) return _stripe
  if (!process.env.STRIPE_SECRET_KEY) return null as unknown as Stripe
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  return _stripe
}
