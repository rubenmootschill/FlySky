'use client'

import { useMemo, useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'

import { AIRLINE_API_SCOPES, type AirlineApiScopeKey } from '@/lib/airline-api-scopes'

type ApiKeyItem = {
  id: string
  name: string
  keyPrefix: string
  scopes: AirlineApiScopeKey[]
  createdAt: string
  lastUsedAt: string | null
}

type Props = {
  initialKeys: ApiKeyItem[]
}

export default function AirlineApiKeysCard({ initialKeys }: Props) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys)
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<AirlineApiScopeKey[]>([])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const canSubmit = useMemo(() => selectedScopes.length > 0 && !saving, [selectedScopes, saving])

  const toggleScope = (scope: AirlineApiScopeKey) => {
    setSelectedScopes((current) => (
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope]
    ))
  }

  const createKey = async () => {
    setSaving(true)
    setError(null)
    setCreatedKey(null)

    try {
      const res = await fetch('/api/airline/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          scopes: selectedScopes,
        }),
      })

      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to create API key')

      setCreatedKey(payload.apiKey)
      setKeys((current) => [payload.key, ...current])
      setName('')
      setSelectedScopes([])
    } catch (err: any) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Airline API Keys</h2>
          <p className="text-xs text-slate-500 mt-1">Create keys and choose exactly what each key can access.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 px-2.5 py-1 text-xs font-medium">
          <KeyRound className="w-3.5 h-3.5" />
          {keys.length} key{keys.length === 1 ? '' : 's'}
        </span>
      </div>

      {createdKey && (
        <div className="rounded-lg border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-500/10 p-3">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">New API key (copy now, this is shown once)</p>
          <p className="mt-1 font-mono text-xs break-all text-emerald-700 dark:text-emerald-200">{createdKey}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300/50 bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Create new API key</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional key name (e.g. Operations Bot)"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Select scopes for new API key:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AIRLINE_API_SCOPES.map((scope) => {
              const checked = selectedScopes.includes(scope)
              return (
                <label key={scope} className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-2 text-xs capitalize">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleScope(scope)}
                  />
                  {scope}
                </label>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={createKey}
          disabled={!canSubmit}
          className="btn-primary text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Create API Key
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Keys</h3>
        {keys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys created yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{key.name}</p>
                    <p className="font-mono text-xs text-slate-500">{key.keyPrefix}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Created {new Date(key.createdAt).toLocaleString()}</p>
                    <p>Last used {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'never'}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {key.scopes.map((scope) => (
                    <span key={scope} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] capitalize text-slate-600 dark:text-slate-300">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
