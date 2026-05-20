'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Plane, Zap, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()

  const { data: pilot } = useQuery({
    queryKey: ['my-pilot'],
    queryFn: () => fetch('/api/pilot/me').then((r) => r.json()),
  })

  const [form, setForm] = useState({ simBriefUser: '', hub: '' })

  const save = useMutation({
    mutationFn: (data: typeof form) =>
      fetch('/api/pilot/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Settings saved!')
      qc.invalidateQueries({ queryKey: ['my-pilot'] })
    },
    onError: () => toast.error('Failed to save'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    save.mutate({ simBriefUser: form.simBriefUser || pilot?.simBriefUser, hub: form.hub || pilot?.hub })
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="section-title">Settings</h1>
        <p className="section-subtitle mt-1">Manage your pilot profile and preferences</p>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-sky-500/10 rounded-full flex items-center justify-center text-2xl font-bold text-sky-400">
            {session?.user?.name?.charAt(0) ?? 'P'}
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{session?.user?.name}</div>
            <div className="font-mono text-sky-400 text-sm">{(session?.user as any)?.callsign ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-0.5">{session?.user?.email}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Pilot preferences */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-400" /> Pilot Preferences
          </h2>
          <div>
            <label className="label">Home Hub Airport</label>
            <input
              type="text"
              maxLength={4}
              value={form.hub || pilot?.hub || ''}
              onChange={(e) => setForm((f) => ({ ...f, hub: e.target.value.toUpperCase() }))}
              className="input"
              placeholder="e.g., EGLL"
            />
          </div>
        </div>

        {/* SimBrief integration */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-400" /> SimBrief Integration
          </h2>
          <p className="text-sm text-slate-400">
            Enter your SimBrief username to enable one-click OFP generation when booking flights.
          </p>
          <div>
            <label className="label">SimBrief Username</label>
            <input
              type="text"
              value={form.simBriefUser || pilot?.simBriefUser || ''}
              onChange={(e) => setForm((f) => ({ ...f, simBriefUser: e.target.value }))}
              className="input"
              placeholder="your_simbrief_username"
            />
          </div>
          {(form.simBriefUser || pilot?.simBriefUser) && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              SimBrief connected
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </form>
    </div>
  )
}
