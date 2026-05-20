'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Award, Shield, Edit2, Trash2, Crown, Ban, MoreVertical,
  ChevronDown, Search, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Pilot {
  id: string
  firstName: string
  lastName: string
  callsign: string
  status: 'ACTIVE' | 'SUSPENDED'
  totalFlights: number
  totalHours: number
  totalPoints: number
  rank?: {
    code: string
    name: string
  }
}

interface PilotAction {
  pilot: Pilot
  type: 'suspend' | 'edit' | 'award' | 'owner' | null
}

export default function AirlinePilotsPage() {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const buttonRefs = useRef<Record<string, HTMLButtonElement>>({})
  const [selectedAction, setSelectedAction] = useState<PilotAction>({ pilot: null as any, type: null })

  useEffect(() => setMounted(true), [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-action-menu]')) {
        setActionMenu(null)
      }
    }
    
    if (actionMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [actionMenu])

  // Fetch airline pilots
  const { data: pilots = [], isLoading, error } = useQuery({
    queryKey: ['airline-pilots'],
    queryFn: async () => {
      const res = await fetch('/api/airline/pilots')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch pilots')
      }
      return res.json()
    },
    enabled: mounted,
  })

  const filteredPilots = pilots.filter((pilot: Pilot) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [pilot.firstName, pilot.lastName, pilot.callsign, pilot.rank?.code ?? '']
      .join(' ')
      .toLowerCase()
      .includes(query)
    const matchesStatus = statusFilter === 'ALL' || pilot.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Suspend pilot mutation
  const suspendMutation = useMutation({
    mutationFn: (pilotId: string) =>
      fetch('/api/airline/pilots/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-pilots'] })
      toast.success('Pilot suspended')
      setSelectedAction({ pilot: null as any, type: null })
    },
    onError: () => toast.error('Failed to suspend pilot'),
  })

  // Unsuspend pilot mutation
  const unsuspendMutation = useMutation({
    mutationFn: (pilotId: string) =>
      fetch('/api/airline/pilots/unsuspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-pilots'] })
      toast.success('Pilot unsuspended')
      setSelectedAction({ pilot: null as any, type: null })
    },
    onError: () => toast.error('Failed to unsuspend pilot'),
  })

  // Transfer ownership mutation
  const transferOwnershipMutation = useMutation({
    mutationFn: (pilotId: string) =>
      fetch('/api/airline/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Ownership transferred successfully')
      setSelectedAction({ pilot: null as any, type: null })
    },
    onError: () => toast.error('Failed to transfer ownership'),
  })

  // Remove pilot from airline
  const removeMutation = useMutation({
    mutationFn: (pilotId: string) =>
      fetch('/api/airline/pilots/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pilotId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-pilots'] })
      toast.success('Pilot removed from airline')
      setSelectedAction({ pilot: null as any, type: null })
    },
    onError: () => toast.error('Failed to remove pilot'),
  })

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="section-title">Pilot Manager</h1>
          <p className="section-subtitle mt-1">Manage and track your airline pilots</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="input h-10 w-full pl-9 pr-3"
            />
          </div>
          <div className="relative w-full sm:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED')}
              className="input h-10 w-full appearance-none pr-9"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <ChevronDown className="pointer-events-none w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 lg:pl-2">
            <Users className="w-4 h-4" />
            {filteredPilots.length} pilot{filteredPilots.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading pilots...</div>
      ) : error ? (
        <div className="card text-center py-16 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 font-medium">{error.message}</p>
          <p className="text-red-500/75 dark:text-red-500/50 text-sm mt-1">Make sure you own an airline to manage pilots</p>
        </div>
      ) : pilots.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-400">No pilots in your airline yet</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-slate-500">Pilot</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-500">Callsign</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-500">Rank</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-500">Flights</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-500">Hours</th>
                  <th className="text-center px-3 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-500 sticky right-0 bg-slate-50 dark:bg-slate-900/50 z-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-900/60">
                {filteredPilots.map((pilot: Pilot) => (
                  <tr
                    key={pilot.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-sky-500/10">
                          <span className="text-sky-400 text-xs font-bold">
                            {pilot.firstName.charAt(0)}{pilot.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white leading-tight">
                            {pilot.firstName} {pilot.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-semibold text-sky-500">{pilot.callsign}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{pilot.rank?.code || '—'}</td>
                    <td className="px-3 py-3 text-center font-medium text-slate-900 dark:text-white">
                      {pilot.totalFlights}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">
                      {Math.round(pilot.totalHours)}h
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          pilot.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {pilot.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right sticky right-0 bg-white dark:bg-slate-950 z-10 border-l border-slate-100 dark:border-slate-900/50">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toast('Pilot stats coming soon', { icon: '📊' })}
                          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Stats"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <div className="relative group" data-action-menu>
                          <button
                            ref={(el) => {
                              if (el) buttonRefs.current[pilot.id] = el
                            }}
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setMenuPosition({ x: rect.right, y: rect.bottom + 8 })
                              setActionMenu(actionMenu === pilot.id ? null : pilot.id)
                            }}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenu === pilot.id && (
                            <div 
                              className="fixed w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50"
                              style={{ left: `${menuPosition.x - 192}px`, top: `${menuPosition.y}px` }}
                            >
                              <button
                                onClick={() => {
                                  if (pilot.status === 'SUSPENDED') {
                                    unsuspendMutation.mutate(pilot.id)
                                  } else {
                                    suspendMutation.mutate(pilot.id)
                                  }
                                  setActionMenu(null)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-sm transition-colors border-b border-slate-100 dark:border-slate-800 first:rounded-t-lg"
                              >
                                <Ban className="w-4 h-4 flex-shrink-0" />
                                {pilot.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                              </button>
                              <button
                                onClick={() => {
                                  toast('Award management coming soon', { icon: '🎖️' })
                                  setActionMenu(null)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-sm transition-colors border-b border-slate-100 dark:border-slate-800"
                              >
                                <Award className="w-4 h-4 flex-shrink-0" />
                                Manage Awards
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Transfer airline ownership to ${pilot.firstName} ${pilot.lastName}?`)) {
                                    transferOwnershipMutation.mutate(pilot.id)
                                  }
                                  setActionMenu(null)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-3 text-sm transition-colors border-b border-slate-100 dark:border-slate-800 text-amber-600 dark:text-amber-400"
                              >
                                <Crown className="w-4 h-4 flex-shrink-0" />
                                Transfer Ownership
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${pilot.firstName} from airline?`)) {
                                    removeMutation.mutate(pilot.id)
                                  }
                                  setActionMenu(null)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-sm transition-colors text-red-600 dark:text-red-400 last:rounded-b-lg"
                              >
                                <Trash2 className="w-4 h-4 flex-shrink-0" />
                                Remove from Airline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
