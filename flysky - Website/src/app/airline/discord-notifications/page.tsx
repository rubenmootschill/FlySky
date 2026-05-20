'use client'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import toast from 'react-hot-toast'

import { AIRLINE_DISCORD_EVENT_KEYS, AIRLINE_DISCORD_EVENT_LABELS, type AirlineDiscordEventKey } from '@/lib/discord-events'

const AIRLINE_EVENT_KEY_SET = new Set<string>(AIRLINE_DISCORD_EVENT_KEYS)

async function readJsonSafe(response: Response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export default function AirlineDiscordNotificationsPage() {
  const { data: discordConfig, isLoading: discordLoading, refetch: refetchDiscord } = useQuery({
    queryKey: ['airline-discord-config'],
    queryFn: async () => {
      const response = await fetch('/api/airline/discord')
      return readJsonSafe(response)
    },
  })

  const [webhookUrl, setWebhookUrl] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [eventToggles, setEventToggles] = useState<Record<AirlineDiscordEventKey, boolean>>({
    PILOT_SIGNUP: false,
    PIREP_ACCEPTED: true,
    EVENT_PUBLISHED: true,
    NOTAM_PUBLISHED: true,
    FLIGHT_PLAN_FILED: true,
    RADAR_STARTED: true,
    RADAR_ENDED: true,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!discordConfig) return
    setNotificationsEnabled(discordConfig.enabled ?? true)
    const safeEvents = Object.fromEntries(
      Object.entries(discordConfig.events ?? {}).filter(([eventKey]) => AIRLINE_EVENT_KEY_SET.has(eventKey)),
    ) as Partial<Record<AirlineDiscordEventKey, boolean>>

    setEventToggles((prev) => ({
      ...prev,
      ...safeEvents,
    }))
  }, [discordConfig])

  const saveDiscordConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/airline/discord', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim() || undefined,
          enabled: notificationsEnabled,
          events: Object.fromEntries(
            AIRLINE_DISCORD_EVENT_KEYS.map((eventKey) => [eventKey, Boolean(eventToggles[eventKey])]),
          ),
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.error ?? 'Failed to save Discord settings.')
      }

      toast.success('Discord settings saved')
      setWebhookUrl('')
      await refetchDiscord()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save Discord settings.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const sendDiscordTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/airline/discord/test', { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload.error ?? 'Test notification failed.')
      }
      toast.success('Test notification sent to Discord')
      await refetchDiscord()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test notification failed.'
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  if (discordLoading) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <BellRing className="w-5 h-5 text-sky-400" />
        <h1 className="section-title">Discord Notifications</h1>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Configure webhook delivery and event subscriptions for this airline.</p>
          <span className="text-xs text-slate-500">
            {discordConfig?.hasWebhook ? 'Webhook configured' : 'No webhook configured'}
          </span>
        </div>

        <div className="space-y-2">
          <label className="label">Discord Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="input"
            placeholder="https://discord.com/api/webhooks/..."
          />
          {discordConfig?.webhookPreview && (
            <p className="text-xs text-slate-500">Current: {discordConfig.webhookPreview}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => setNotificationsEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Enable Discord notifications for this airline
        </label>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Subscribed Events</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AIRLINE_DISCORD_EVENT_KEYS.map((eventKey) => (
              <label key={eventKey} className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(eventToggles[eventKey])}
                  onChange={(e) => setEventToggles((prev) => ({ ...prev, [eventKey]: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{AIRLINE_DISCORD_EVENT_LABELS[eventKey]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveDiscordConfig}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Discord Settings'}
          </button>
          <button
            type="button"
            onClick={sendDiscordTest}
            disabled={testing}
            className="btn-secondary"
          >
            {testing ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>

        {discordConfig?.lastError && (
          <p className="text-xs text-rose-400">Last error: {discordConfig.lastError}</p>
        )}
      </div>
    </div>
  )
}