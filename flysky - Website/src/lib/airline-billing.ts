import { prisma } from '@/lib/prisma'
import type { Prisma, AirlineSubscription, AirlineSubscriptionStatus, PaymentStatus } from '@prisma/client'

const TRIAL_DURATION_DAYS = 30
const MONTHLY_PRICE_CENTS = 1500
const TRIAL_REMINDER_WINDOW_DAYS = 5

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export function formatCurrency(amountCents: number) {
  return `€${(amountCents / 100).toFixed(2)}`
}

export function getTrialEndsAt() {
  return addDays(new Date(), TRIAL_DURATION_DAYS)
}

export function isSubscriptionActive(subscription: AirlineSubscription | null) {
  if (!subscription) return false
  const now = new Date()

  if (subscription.status === 'ACTIVE') {
    return subscription.currentPeriodEnd >= now
  }

  if (subscription.status === 'TRIALING') {
    return subscription.trialEndsAt >= now
  }

  return false
}

export function isTrialExpiringSoon(subscription: AirlineSubscription | null) {
  if (!subscription || subscription.status !== 'TRIALING') return false
  const now = new Date()
  const end = subscription.trialEndsAt
  const daysUntil = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil > 0 && daysUntil <= TRIAL_REMINDER_WINDOW_DAYS
}

export function getTrialDaysLeft(subscription: AirlineSubscription | null) {
  if (!subscription || subscription.status !== 'TRIALING') return 0
  const now = new Date()
  const millisecondsLeft = subscription.trialEndsAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(millisecondsLeft / (1000 * 60 * 60 * 24)))
}

export async function createTrialSubscription(
  tx: Prisma.TransactionClient,
  airlineId: string,
) {
  const now = new Date()
  const trialEndsAt = addDays(now, TRIAL_DURATION_DAYS)

  return (tx as any).airlineSubscription.upsert({
    where: { airlineId },
    update: {
      plan: 'monthly',
      status: 'TRIALING',
      trialStartAt: now,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      airlineId,
      plan: 'monthly',
      status: 'TRIALING',
      trialStartAt: now,
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      cancelAtPeriodEnd: false,
    },
  })
}

export async function recordPayment(
  tx: Prisma.TransactionClient,
  airlineId: string,
  amountCents: number,
  description?: string,
  status: PaymentStatus = 'PAID',
) {
  const now = new Date()
  const payment = await (tx as any).airlinePaymentRecord.create({
    data: {
      airlineId,
      amount: amountCents,
      currency: 'EUR',
      status,
      description,
      externalPaymentId: null,
      paidAt: status === 'PAID' ? now : null,
    },
  })

  if (status === 'PAID') {
    const currentPeriodEnd = addDays(now, TRIAL_DURATION_DAYS)
    await (tx as any).airlineSubscription.upsert({
      where: { airlineId },
      update: {
        plan: 'monthly',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      create: {
        airlineId,
        plan: 'monthly',
        status: 'ACTIVE',
        trialStartAt: now,
        trialEndsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    })
  }

  return payment
}

export async function cancelSubscriptionAtPeriodEnd(
  tx: Prisma.TransactionClient,
  airlineId: string,
) {
  return (tx as any).airlineSubscription.updateMany({
    where: { airlineId, status: { in: ['ACTIVE', 'TRIALING'] } },
    data: { cancelAtPeriodEnd: true },
  })
}

export async function getAirlineBillingStatus(airlineId: string) {
  return (prisma as any).airlineSubscription.findUnique({
    where: { airlineId },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
  })
}

export async function getAirlineSubscription(airlineId: string) {
  return (prisma as any).airlineSubscription.findUnique({
    where: { airlineId },
  })
}
