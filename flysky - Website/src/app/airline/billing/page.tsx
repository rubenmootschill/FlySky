'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CreditCard, CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

export default function AirlineBillingPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['airline-billing'],
    queryFn: async () => {
      const res = await fetch('/api/airline/billing')
      if (!res.ok) throw new Error('Failed to load billing data')
      return await res.json()
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/airline/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-payment',
          amountCents: 1500,
          description: 'Monthly subscription payment',
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to record payment')
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-billing'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to record payment'
      toast.error(message)
    },
  })

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/airline/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to cancel subscription')
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-billing'] })
      toast.success('Cancellation scheduled at the end of the current period')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to cancel subscription'
      toast.error(message)
    },
  })

  const subscription = data?.subscription
  const payments = data?.payments ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title">Billing & Payments</h1>
          <p className="section-description max-w-2xl">
            Manage your airline subscription, review upcoming trial and payment dates, and keep all billing history in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Subscription plan</p>
              <p className="text-xs text-slate-500">€15 / month after 30-day free trial</p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ) : subscription ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Status</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{subscription.status}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Next payment</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Trial window</p>
                <p className="text-sm text-slate-500 mt-1">
                  {subscription.status === 'TRIALING'
                    ? `${subscription.trialDaysLeft} day${subscription.trialDaysLeft === 1 ? '' : 's'} left in free trial.`
                    : 'Your trial period has ended.'}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Need to update payment status?</p>
                <p className="text-sm text-slate-500">
                  After your trial period, every active airline is billed €15 per month. Record a payment after payment is received to keep the records up to date.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => recordPaymentMutation.mutate()}
                    disabled={(recordPaymentMutation as any).isLoading}
                  >
                    {(recordPaymentMutation as any).isLoading ? 'Recording…' : 'Record payment'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => cancelSubscriptionMutation.mutate()}
                    disabled={(cancelSubscriptionMutation as any).isLoading}
                  >
                    {(cancelSubscriptionMutation as any).isLoading ? 'Scheduling…' : 'Cancel subscription'}
                  </button>
                  <button
                    type="button"
                    className="btn-cta"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/stripe/create-checkout-session', { method: 'POST' })
                        const payload = await res.json()
                        if (!res.ok) throw new Error(payload.error || 'Failed to create checkout')
                        if (payload.url) window.location.href = payload.url
                      } catch (err) {
                        toast.error((err as Error).message || 'Failed to start Stripe checkout')
                      }
                    }}
                  >
                    Subscribe with Stripe
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-slate-500 dark:text-slate-400">
              No billing subscription is currently attached to this airline. A trial subscription is created automatically when your airline is approved.
            </div>
          )}
        </div>

        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Payment history</p>
              <p className="text-xs text-slate-500">All payments recorded for this airline.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
          ) : payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div key={payment.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(payment.amount, payment.currency)}</p>
                    <p className="text-sm text-slate-500">{payment.description ?? 'Subscription payment'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{payment.status}</p>
                    <p className="text-xs text-slate-500">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-slate-500 dark:text-slate-400">
              No payment records have been added yet.
            </div>
          )}
        </div>
      </div>

      <div className="card bg-slate-950 text-slate-100 border-slate-800">
        <div className="flex items-center gap-3 text-slate-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm">
            Your airline receives a 30-day free trial when the application is approved. After that, the subscription renews automatically at €15 per month. You can cancel anytime and keep access through the current billing period.
          </p>
        </div>
      </div>
    </div>
  )
}
