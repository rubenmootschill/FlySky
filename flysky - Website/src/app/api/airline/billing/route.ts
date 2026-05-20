import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { recordPayment, cancelSubscriptionAtPeriodEnd, getAirlineBillingStatus, formatCurrency, getTrialDaysLeft } from '@/lib/airline-billing'
import { z } from 'zod'

const billingActionSchema = z.object({
  action: z.enum(['record-payment', 'cancel']),
  amountCents: z.number().int().positive().optional(),
  description: z.string().max(200).optional(),
})

export async function GET() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN' && !session.user.email) {
    return NextResponse.json({ error: 'Your account has no email bound to an airline owner profile.' }, { status: 400 })
  }

  const airlineId = await resolveActiveAirlineId(session.user)
  if (!airlineId) {
    return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
  }

  const subscription = await getAirlineBillingStatus(airlineId)
  if (!subscription) {
    return NextResponse.json({ subscription: null, payments: [] })
  }

  return NextResponse.json({
    subscription: {
      status: subscription.status,
      plan: subscription.plan,
      trialStartAt: subscription.trialStartAt,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      trialDaysLeft: getTrialDaysLeft(subscription),
      monthlyPrice: formatCurrency(1500),
    },
    payments: subscription.payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
  })
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN' && !session.user.email) {
    return NextResponse.json({ error: 'Your account has no email bound to an airline owner profile.' }, { status: 400 })
  }

  const airlineId = await resolveActiveAirlineId(session.user)
  if (!airlineId) {
    return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = billingActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { action, amountCents, description } = parsed.data
  try {
    if (action === 'cancel') {
      await cancelSubscriptionAtPeriodEnd(prisma, airlineId)
      return NextResponse.json({ ok: true })
    }

    if (!amountCents) {
      return NextResponse.json({ error: 'Payment amount is required.' }, { status: 400 })
    }

    const payment = await prisma.$transaction(async (tx) => {
      return await recordPayment(tx as any, airlineId, amountCents, description ?? 'Subscription payment', 'PAID')
    })

    return NextResponse.json({ ok: true, payment })
  } catch (error) {
    console.error('POST /api/airline/billing failed:', error)
    return NextResponse.json({ error: 'Failed to save billing update' }, { status: 500 })
  }
}
