import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { recordPayment } from '@/lib/airline-billing'

export const POST = async (request: Request) => {
  const buf = await request.arrayBuffer()
  const rawBody = Buffer.from(buf)
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session: any = event.data.object
        const airlineId = session.metadata?.airlineId
        const subscriptionId = session.subscription
        if (!airlineId || !subscriptionId) break

        // fetch subscription and latest invoice to determine amount
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const invoiceId = subscription.latest_invoice as string | null
        if (!invoiceId) break
        const invoice = await stripe.invoices.retrieve(invoiceId)
        const amountPaid = invoice.amount_paid

        await prisma.$transaction(async (tx) => {
          await recordPayment(tx as any, airlineId, amountPaid ?? 0, 'Stripe subscription payment', 'PAID')
        })
        break
      }

      case 'invoice.payment_failed': {
        // Optional: mark payment as failed
        break
      }

      case 'customer.subscription.deleted': {
        // Optional: mark subscription canceled
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handling error', err)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
