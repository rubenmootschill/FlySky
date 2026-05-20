'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, Users, MapPin, Plane, CheckCircle2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface Airline {
  id: string
  name: string
  callsignPrefix: string
  icaoCode: string | null
  logoUrl: string | null
  website: string | null
  hub: string
  description: string | null
  _count: {
    memberships: number
  }
}

interface Membership {
  airlineId: string
  airline: { id: string; name: string; callsignPrefix: string; logoUrl: string | null }
}

interface Pilot {
  id: string
  airlineId: string | null
  memberships: Membership[]
}

export default function AirlinesPage() {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: airlines = [], isLoading } = useQuery({
    queryKey: ['airlines'],
    queryFn: () => fetch('/api/airlines').then((r) => r.json()),
    enabled: mounted,
  })

  const { data: pilot } = useQuery<Pilot>({
    queryKey: ['current-pilot'],
    queryFn: () => fetch('/api/pilot/profile').then((r) => r.json()),
    enabled: mounted,
  })

  const joinMutation = useMutation({
    mutationFn: (airlineId: string) =>
      fetch('/api/pilot/airline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-pilot'] })
      queryClient.invalidateQueries({ queryKey: ['airlines'] })
      toast.success('Joined airline!')
    },
    onError: () => toast.error('Failed to join airline'),
  })

  const leaveMutation = useMutation({
    mutationFn: (airlineId: string) =>
      fetch('/api/pilot/airline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-pilot'] })
      queryClient.invalidateQueries({ queryKey: ['airlines'] })
      toast.success('Left airline')
    },
    onError: () => toast.error('Failed to leave airline'),
  })

  const selectMutation = useMutation({
    mutationFn: (airlineId: string) =>
      fetch('/api/pilot/airline/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-pilot'] })
      toast.success('Active airline updated')
    },
    onError: () => toast.error('Failed to select airline'),
  })

  if (!mounted) return null

  const memberIds = new Set((pilot?.memberships ?? []).map((m) => m.airlineId))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Airlines</h1>
        <p className="text-sm text-slate-500 mt-0.5">Join multiple airlines and switch your active one anytime</p>
      </div>

      {/* Current memberships bar */}
      {pilot && memberIds.size > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Your Airlines</p>
          <div className="flex flex-wrap gap-2">
            {pilot.memberships.map((m) => {
              const isActive = pilot.airlineId === m.airlineId
              return (
                <div
                  key={m.airlineId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isActive && <Star className="w-3 h-3 fill-sky-500 text-sky-500" />}
                  <span>{m.airline.callsignPrefix} – {m.airline.name}</span>
                  {!isActive && (
                    <button
                      onClick={() => selectMutation.mutate(m.airlineId)}
                      disabled={selectMutation.isPending}
                      className="ml-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      Set active
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Airlines Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading airlines...</div>
      ) : airlines.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No airlines available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {airlines.map((airline: Airline) => {
            const isMember = memberIds.has(airline.id)
            const isActive = pilot?.airlineId === airline.id

            return (
              <div
                key={airline.id}
                className={`card !p-0 overflow-hidden transition-colors ${
                  isActive ? 'ring-1 ring-sky-500/40' : ''
                }`}
              >
                {/* Logo header */}
                <div className="bg-slate-100 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800">
                  {airline.logoUrl ? (
                    <img src={airline.logoUrl} alt={airline.name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                      <Plane className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{airline.name}</h3>
                      {isActive && <Star className="w-4 h-4 text-sky-500 fill-sky-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{airline.callsignPrefix}</span>
                      {airline.icaoCode && <span className="font-mono text-xs">{airline.icaoCode}</span>}
                    </div>
                  </div>

                  {airline.description && <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{airline.description}</p>}

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Hub: {airline.hub}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>{airline._count.memberships} pilot{airline._count.memberships !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {airline.website && (
                    <a
                      href={airline.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-500 hover:text-sky-400 transition-colors"
                    >
                      Visit website →
                    </a>
                  )}

                  {/* Actions */}
                  <div className="pt-1 flex gap-2">
                    {isMember ? (
                      <>
                        {!isActive && (
                          <button
                            onClick={() => selectMutation.mutate(airline.id)}
                            disabled={selectMutation.isPending}
                            className="flex-1 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Set Active
                          </button>
                        )}
                        {isActive && (
                          <div className="flex-1 flex items-center gap-1.5 text-sm text-sky-500 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Active Airline
                          </div>
                        )}
                        <button
                          onClick={() => leaveMutation.mutate(airline.id)}
                          disabled={leaveMutation.isPending}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                          title="Leave airline"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => joinMutation.mutate(airline.id)}
                        disabled={joinMutation.isPending}
                        className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        Join Airline
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
