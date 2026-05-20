import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session.user.email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const airlineId = await resolveActiveAirlineId(session.user)
  if (!airlineId) return NextResponse.json({ error: 'Airline not selected' }, { status: 400 })

  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY
  if (!priceId) return NextResponse.json({ error: 'Missing price id' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? `${request.url.split('/').slice(0,3).join('/')}`

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: session.user.email as string,
    success_url: `${origin}/airline/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/airline/billing?canceled=1`,
    subscription_data: {
      metadata: { airlineId },
    },
    metadata: { airlineId },
  })

  return NextResponse.json({ url: checkout.url })
}
