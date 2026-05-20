'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'

async function readJsonSafe(response: Response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export default function AirlineGeneralPage() {
  const { data: airline, isLoading } = useQuery({
    queryKey: ['airline-me'],
    queryFn: async () => {
      const response = await fetch('/api/airline/me')
      return readJsonSafe(response)
    },
  })

  if (isLoading) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-sky-400" />
        <h1 className="section-title">General Settings</h1>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="font-medium text-slate-900 dark:text-white text-sm">Airline Status</div>
            <div className="text-xs text-slate-500">Current operating status</div>
          </div>
          <span className="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{airline?.status}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="font-medium text-slate-900 dark:text-white text-sm">Callsign Prefix</div>
            <div className="text-xs text-slate-500">Used for all flight numbers</div>
          </div>
          <span className="font-mono text-sky-400 font-bold">{airline?.callsignPrefix}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-slate-900 dark:text-white text-sm">Home Hub</div>
            <div className="text-xs text-slate-500">Primary base of operations</div>
          </div>
          <span className="font-mono text-slate-900 dark:text-white">{airline?.hub}</span>
        </div>
      </div>

      <div className="card bg-amber-500/5 border-amber-500/20">
        <p className="text-sm text-amber-400">To update airline name, hub, or description, contact a FlySky admin.</p>
      </div>

    </div>
  )
}
