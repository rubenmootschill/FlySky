'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Clock3, Pencil, Plus, RefreshCw, Search, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

type Schedule = {
  id: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  aircraftType?: string | null
  distance: number
  flightTime: number
  active: boolean
}

type AirlineAirportNetwork = {
  id: string
  airport: {
    icao: string
    name: string
    city: string
  }
}

type AirportOption = {
  icao: string
  label: string
}

type AirframeNode = {
  code: string
  name: string
  manufacturer?: string
  count: number
  passengers?: number | null
}

type FleetAircraftType = {
  id: string
  icaoCode: string
  name: string
  manufacturer: string
  passengers: number
}

type FleetItem = {
  id: string
  count: number
  fleetAircraftType: FleetAircraftType
}

type GroupedAirframes = Record<'M' | 'L' | 'XL', AirframeNode[]>

type FormState = {
  flightNumber: string
  depIcao: string
  arrIcao: string
  aircraftType: string
  duration: string
}

type SubmitPayload = {
  flightNumber: string
  depIcao: string
  arrIcao: string
  aircraftType?: string
  flightTime: number
}

const defaultForm: FormState = {
  flightNumber: '',
  depIcao: '',
  arrIcao: '',
  aircraftType: '',
  duration: '01:00',
}

const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const dayLabelsLong: Array<{ short: string; label: string }> = [
  { short: 'Mo', label: 'Mon' },
  { short: 'Tu', label: 'Tue' },
  { short: 'We', label: 'Wed' },
  { short: 'Th', label: 'Thu' },
  { short: 'Fr', label: 'Fri' },
  { short: 'Sa', label: 'Sat' },
  { short: 'Su', label: 'Sun' },
]

function getModeForAirframe(airframe: AirframeNode): 'PASSENGER' | 'CARGO' {
  const text = `${airframe.code} ${airframe.name}`.toUpperCase()
  const likelyCargo = /CARGO|FREIGHT|P2F|F$/.test(text)
  if (likelyCargo || (airframe.passengers ?? 0) === 0) return 'CARGO'
  return 'PASSENGER'
}

function getSizeGroup(airframe: AirframeNode): 'M' | 'L' | 'XL' {
  if (getModeForAirframe(airframe) === 'PASSENGER') {
    const pax = airframe.passengers ?? 0
    if (pax > 320) return 'XL'
    if (pax > 220) return 'L'
    return 'M'
  }

  const code = airframe.code.toUpperCase()
  if (/77F|748F|124|225|AN225/.test(code)) return 'XL'
  if (/763|767|777|330|332|33F/.test(code)) return 'L'
  return 'M'
}

function toDuration(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

function toMinutes(duration: string) {
  const parts = duration.split(':')
  const h = Number(parts[0] || '0')
  const m = Number(parts[1] || '0')
  if (Number.isNaN(h) || Number.isNaN(m)) return 60
  return Math.max(1, h * 60 + m)
}

export default function AirlineSchedulesPage() {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mode, setMode] = useState<'PASSENGER' | 'CARGO'>('PASSENGER')
  const [showValidation, setShowValidation] = useState(false)
  const [selectedAirframes, setSelectedAirframes] = useState<string[]>([])
  const [depSearch, setDepSearch] = useState('')
  const [arrSearch, setArrSearch] = useState('')
  const [depFocused, setDepFocused] = useState(false)
  const [arrFocused, setArrFocused] = useState(false)
  const [days, setDays] = useState<Record<string, boolean>>({
    Mo: true,
    Tu: true,
    We: true,
    Th: true,
    Fr: true,
    Sa: true,
    Su: true,
  })
  const [form, setForm] = useState<FormState>(defaultForm)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['airline-schedules'],
    enabled: mounted,
    queryFn: async () => {
      const res = await fetch('/api/airline/schedules')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load schedules')
      return data
    },
  })

  const { data: airportNetwork = [] } = useQuery<AirlineAirportNetwork[]>({
    queryKey: ['airline-airports-network-options'],
    enabled: mounted,
    queryFn: async () => {
      const res = await fetch('/api/airline/airports')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load airports')
      return data.airports ?? []
    },
  })

  const { data: fleet = [] } = useQuery<FleetItem[]>({
    queryKey: ['airline-fleet'],
    enabled: mounted,
    queryFn: async () => {
      const res = await fetch('/api/airline/fleet')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load fleet')
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: SubmitPayload) => {
      const res = await fetch('/api/airline/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create schedule')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-schedules'] })
      toast.success('Schedule created')
      closeModal()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create schedule'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<SubmitPayload> }) => {
      const res = await fetch(`/api/airline/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-schedules'] })
      toast.success('Schedule updated')
      closeModal()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update schedule'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (schedule: Schedule) => {
      const res = await fetch(`/api/airline/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !schedule.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-schedules'] })
      toast.success('Status updated')
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update schedule'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/airline/schedules/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete schedule')
      return data
    },
    onSuccess: (data: { archived?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['airline-schedules'] })
      toast.success(data?.archived ? 'Schedule archived (has bookings history)' : 'Schedule deleted')
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete schedule'),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return schedules
    return schedules.filter((s) => {
      return [s.flightNumber, s.depIcao, s.arrIcao, s.aircraftType || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [schedules, search])

  const airportOptions = useMemo<AirportOption[]>(() => {
    const byIcao = new Map<string, AirportOption>()

    for (const entry of airportNetwork) {
      const icao = entry.airport.icao.toUpperCase()
      byIcao.set(icao, {
        icao,
        label: `${icao} - ${entry.airport.city}`,
      })
    }

    // Fallback so schedule editing/creation still works even if network airports are empty.
    for (const s of schedules) {
      const dep = s.depIcao.toUpperCase()
      const arr = s.arrIcao.toUpperCase()
      if (!byIcao.has(dep)) byIcao.set(dep, { icao: dep, label: dep })
      if (!byIcao.has(arr)) byIcao.set(arr, { icao: arr, label: arr })
    }

    return Array.from(byIcao.values()).sort((a, b) => a.icao.localeCompare(b.icao))
  }, [airportNetwork, schedules])

  const getAirportLabel = (icao: string) => {
    const match = airportOptions.find((a) => a.icao === icao)
    return match?.label || icao
  }

  const depMatches = useMemo(() => {
    const q = depSearch.trim().toLowerCase()
    const list = airportOptions.filter((a) => a.icao !== form.arrIcao)
    if (!q) return list.slice(0, 8)
    return list
      .filter((a) => a.label.toLowerCase().includes(q) || a.icao.toLowerCase().includes(q))
      .slice(0, 8)
  }, [airportOptions, depSearch, form.arrIcao])

  const arrMatches = useMemo(() => {
    const q = arrSearch.trim().toLowerCase()
    const list = airportOptions.filter((a) => a.icao !== form.depIcao)
    if (!q) return list.slice(0, 8)
    return list
      .filter((a) => a.label.toLowerCase().includes(q) || a.icao.toLowerCase().includes(q))
      .slice(0, 8)
  }, [airportOptions, arrSearch, form.depIcao])

  const ownedAirframes = useMemo<AirframeNode[]>(() => {
    const byCode = new Map<string, AirframeNode>()

    for (const item of fleet) {
      const code = item.fleetAircraftType.icaoCode.toUpperCase()
      const existing = byCode.get(code)
      if (existing) {
        existing.count += item.count
      } else {
        byCode.set(code, {
          code,
          name: item.fleetAircraftType.name,
          manufacturer: item.fleetAircraftType.manufacturer,
          count: item.count,
          passengers: item.fleetAircraftType.passengers,
        })
      }
    }

    return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [fleet])

  const hasPassengerAirframes = useMemo(
    () => ownedAirframes.some((a) => getModeForAirframe(a) === 'PASSENGER'),
    [ownedAirframes]
  )

  const hasCargoAirframes = useMemo(
    () => ownedAirframes.some((a) => getModeForAirframe(a) === 'CARGO'),
    [ownedAirframes]
  )

  const modeTree = useMemo<GroupedAirframes>(() => {
    const grouped: GroupedAirframes = { M: [], L: [], XL: [] }
    for (const airframe of ownedAirframes) {
      if (getModeForAirframe(airframe) !== mode) continue
      grouped[getSizeGroup(airframe)].push(airframe)
    }

    return grouped
  }, [ownedAirframes, mode])

  const modeAirframeCodes = useMemo(
    () => Object.values(modeTree).flat().map((a) => a.code),
    [modeTree]
  )

  const isAirframeChecked = (code: string) => selectedAirframes.includes(code)

  const setGroupChecked = (group: 'M' | 'L' | 'XL', checked: boolean) => {
    const codes = modeTree[group].map((a) => a.code)
    setSelectedAirframes((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...codes]))
      }
      return prev.filter((code) => !codes.includes(code))
    })
  }

  const setAllChecked = (checked: boolean) => {
    setSelectedAirframes((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...modeAirframeCodes]))
      }
      return prev.filter((code) => !modeAirframeCodes.includes(code))
    })
  }

  const isGroupChecked = (group: 'M' | 'L' | 'XL') => {
    const codes = modeTree[group].map((a) => a.code)
    return codes.length > 0 && codes.every((code) => selectedAirframes.includes(code))
  }

  const isAllChecked = modeAirframeCodes.length > 0 && modeAirframeCodes.every((code) => selectedAirframes.includes(code))

  if (!mounted) {
    return (
      <div className="space-y-5">
        <h1 className="section-title">Schedules</h1>
        <div className="card py-10 text-center text-slate-500">Loading schedules...</div>
      </div>
    )
  }

  const openCreate = () => {
    setEditingId(null)
    setShowValidation(false)
    setMode(hasPassengerAirframes ? 'PASSENGER' : hasCargoAirframes ? 'CARGO' : 'PASSENGER')
    setSelectedAirframes([])
    setDepSearch('')
    setArrSearch('')
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (s: Schedule) => {
    setEditingId(s.id)
    setShowValidation(false)
    const selectedCode = s.aircraftType?.toUpperCase() || ''
    const matched = ownedAirframes.find((a) => a.code === selectedCode)
    setMode(matched ? getModeForAirframe(matched) : hasPassengerAirframes ? 'PASSENGER' : 'CARGO')
    setSelectedAirframes(s.aircraftType ? [s.aircraftType] : [])
    setDepSearch(getAirportLabel(s.depIcao))
    setArrSearch(getAirportLabel(s.arrIcao))
    setForm({
      flightNumber: s.flightNumber,
      depIcao: s.depIcao,
      arrIcao: s.arrIcao,
      aircraftType: s.aircraftType || '',
      duration: toDuration(s.flightTime),
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setShowValidation(false)
    setSelectedAirframes([])
    setDepSearch('')
    setArrSearch('')
    setDepFocused(false)
    setArrFocused(false)
    setForm(defaultForm)
  }

  const generateFlightNumber = () => {
    const nums = schedules
      .map((s) => Number((s.flightNumber.match(/\d+/)?.[0]) || '0'))
      .filter((n) => !Number.isNaN(n))
    const next = Math.max(100, ...nums) + 2
    setForm((prev) => ({ ...prev, flightNumber: `FIY${next}` }))
  }

  const submitForm = () => {
    setShowValidation(true)
    if (!form.depIcao || !form.arrIcao || !form.flightNumber.trim()) {
      toast.error('Departure, arrival and flight number are required')
      return
    }

    const payload = {
      flightNumber: form.flightNumber.trim().toUpperCase(),
      depIcao: form.depIcao.toUpperCase(),
      arrIcao: form.arrIcao.toUpperCase(),
      aircraftType: selectedAirframes[0] || form.aircraftType.trim().toUpperCase() || undefined,
      flightTime: toMinutes(form.duration),
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="section-title">Schedules</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs sm:text-sm">EXPORT / IMPORT</button>
          <button onClick={openCreate} className="btn-secondary text-xs sm:text-sm">
            <Plus className="w-4 h-4" />
            ADD SCHEDULE
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="input pl-9 h-10 w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <tr>
                <th className="text-left px-3 py-3 font-medium">Flight #</th>
                <th className="text-left px-3 py-3 font-medium">Dep</th>
                <th className="text-left px-3 py-3 font-medium">Arr</th>
                <th className="text-left px-3 py-3 font-medium">Type</th>
                <th className="text-left px-3 py-3 font-medium">Days of week</th>
                <th className="text-left px-3 py-3 font-medium">Airframes</th>
                <th className="text-left px-3 py-3 font-medium">Duration</th>
                <th className="text-left px-3 py-3 font-medium">Stats (last 30 days)</th>
                <th className="text-left px-3 py-3 font-medium">Balance (last 30 days)</th>
                <th className="text-right px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">Loading schedules...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">No schedules found</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-900/70 last:border-0">
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{s.flightNumber}</td>
                    <td className="px-3 py-3 font-mono text-slate-300">{s.depIcao}</td>
                    <td className="px-3 py-3 font-mono text-slate-300">{s.arrIcao}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-medium">PAX</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {dayLabels.map((d) => (
                          <span key={d} className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px]">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-medium">{s.aircraftType || 'PAX'}</span></td>
                    <td className="px-3 py-3 text-slate-300">{toDuration(s.flightTime)}</td>
                    <td className="px-3 py-3 text-slate-400">0</td>
                    <td className="px-3 py-3">
                      <div className="text-emerald-400">+ 0 $</div>
                      <div className="text-red-500">- {(Math.max(3, Math.round(s.flightTime / 10)) / 10).toFixed(1)}k $</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggleMutation.mutate(s)} className="text-slate-400 hover:text-emerald-400" title="Toggle active">
                          {s.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteMutation.mutate(s.id)} className="text-slate-400 hover:text-red-500" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-emerald-400" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="text-slate-400 hover:text-sky-400" title="Stats">
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-[#1b1f2a] p-0 max-h-[94vh] overflow-hidden text-slate-100 shadow-2xl">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-blue-700">
              <h2 className="text-2xl font-semibold text-white">{editingId ? 'Edit Schedule' : 'Add Schedule'}</h2>
              <button onClick={closeModal} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded border border-slate-600 p-1 bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setMode('PASSENGER')}
                  disabled={!hasPassengerAirframes}
                  className={`h-8 rounded text-sm font-semibold ${mode === 'PASSENGER' ? 'bg-blue-600 text-white' : 'text-slate-300'} ${!hasPassengerAirframes ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  PASSENGER
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CARGO')}
                  disabled={!hasCargoAirframes}
                  className={`h-8 rounded text-sm font-semibold ${mode === 'CARGO' ? 'bg-blue-600 text-white' : 'text-slate-300'} ${!hasCargoAirframes ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  CARGO
                </button>
              </div>

              <div>
                <label className="label">Departure</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={depSearch}
                    onFocus={() => setDepFocused(true)}
                    onBlur={() => setDepFocused(false)}
                    onChange={(e) => {
                      setDepSearch(e.target.value)
                      setForm((prev) => ({ ...prev, depIcao: '' }))
                    }}
                    placeholder="Select departure airport"
                    className={`input w-full pl-9 bg-[#20232d] border-slate-600 text-slate-100 ${showValidation && !form.depIcao ? 'border-red-500' : ''}`}
                  />
                </div>
                {depFocused && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded border border-slate-600 bg-[#1a1f2b]">
                    {depMatches.length === 0 ? (
                      <div className="p-2 text-xs text-slate-400">No matching airports</div>
                    ) : (
                      depMatches.map((a) => (
                        <button
                          key={a.icao}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setForm((prev) => ({ ...prev, depIcao: a.icao }))
                            setDepSearch(a.label)
                            setDepFocused(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-blue-600/20"
                        >
                          {a.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {showValidation && !form.depIcao && <div className="text-xs text-red-500 mt-1">Field is required</div>}
              </div>

              <div>
                <label className="label">Arrival</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={arrSearch}
                    onFocus={() => setArrFocused(true)}
                    onBlur={() => setArrFocused(false)}
                    onChange={(e) => {
                      setArrSearch(e.target.value)
                      setForm((prev) => ({ ...prev, arrIcao: '' }))
                    }}
                    placeholder="Select arrival airport"
                    className={`input w-full pl-9 bg-[#20232d] border-slate-600 text-slate-100 ${showValidation && !form.arrIcao ? 'border-red-500' : ''}`}
                  />
                </div>
                {arrFocused && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded border border-slate-600 bg-[#1a1f2b]">
                    {arrMatches.length === 0 ? (
                      <div className="p-2 text-xs text-slate-400">No matching airports</div>
                    ) : (
                      arrMatches.map((a) => (
                        <button
                          key={a.icao}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setForm((prev) => ({ ...prev, arrIcao: a.icao }))
                            setArrSearch(a.label)
                            setArrFocused(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-blue-600/20"
                        >
                          {a.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">Start typing airport name, city or ICAO code to search</div>
                {showValidation && !form.arrIcao && <div className="text-xs text-red-500 mt-1">Field is required</div>}
              </div>

              <div>
                <label className="label">Flight #</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={form.flightNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, flightNumber: e.target.value.toUpperCase() }))}
                    className="input w-full bg-[#20232d] border-slate-600 text-slate-100"
                  />
                  <button type="button" onClick={generateFlightNumber} className="btn-secondary" title="Generate flight number">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-1">Select flight number (use button on the right to generate based on network IDs)</div>
              </div>

              <div>
                <label className="label">Duration</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="01:00"
                    className="input w-full pr-9 bg-[#20232d] border-slate-600 text-slate-100"
                  />
                  <Clock3 className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <div className="text-xs text-slate-500 mt-1">Provide flight duration from takeoff to landing</div>
              </div>

              <div>
                <div className="label mb-2">Days</div>
                <div className="rounded border border-slate-600 p-2">
                  <div className="grid grid-cols-7 gap-2">
                    {dayLabelsLong.map((d) => (
                      <label key={d.short} className="flex flex-col items-center gap-1 text-xs text-slate-300">
                        <span>{d.label}</span>
                        <input
                          type="checkbox"
                          checked={days[d.short]}
                          onChange={() => setDays((prev) => ({ ...prev, [d.short]: !prev[d.short] }))}
                          className="h-4 w-4 rounded border-slate-500 bg-[#20232d] text-blue-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Select days of operation</div>
              </div>

              <div>
                <div className="rounded border border-slate-600 p-3 space-y-2 bg-[#181b24]">
                  <label className="flex items-center gap-2 text-blue-400 font-semibold">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={(e) => setAllChecked(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-500 bg-[#20232d] text-blue-600"
                    />
                    <span>All</span>
                  </label>

                  <label className="flex items-center gap-2 text-blue-400 font-semibold pl-4">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={(e) => setAllChecked(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-500 bg-[#20232d] text-blue-600"
                    />
                    <span>{mode === 'PASSENGER' ? 'Passenger' : 'Cargo'}</span>
                  </label>

                  {modeAirframeCodes.length === 0 && (
                    <div className="text-sm text-slate-400 pl-4 py-2">No owned airframes found in your airline fleet for this mode.</div>
                  )}

                  {(['M', 'L', 'XL'] as const)
                    .filter((group) => modeTree[group].length > 0)
                    .map((group) => (
                    <div key={group} className="pl-8">
                      <label className="flex items-center gap-2 text-blue-400 font-semibold">
                        <input
                          type="checkbox"
                          checked={isGroupChecked(group)}
                          onChange={(e) => setGroupChecked(group, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-500 bg-[#20232d] text-blue-600"
                        />
                        <span>{group}</span>
                      </label>
                      <div className="pl-7 mt-1 space-y-1">
                        {modeTree[group].map((airframe) => (
                          <label key={airframe.code} className="flex items-center gap-2 text-slate-200">
                            <input
                              type="checkbox"
                              checked={isAirframeChecked(airframe.code)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedAirframes((prev) => {
                                  if (checked) return Array.from(new Set([...prev, airframe.code]))
                                  return prev.filter((code) => code !== airframe.code)
                                })
                              }}
                              className="h-4 w-4 rounded border-slate-500 bg-[#20232d] text-blue-600"
                            />
                            <span className="text-blue-400 font-semibold min-w-[52px]">{airframe.code}</span>
                            <span className="text-slate-300">{airframe.manufacturer} {airframe.name}</span>
                            <span className="text-xs text-slate-500">x{airframe.count}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-1">Select airframes that operate this route</div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">CANCEL</button>
                <button type="button" onClick={submitForm} className="btn-primary">{editingId ? 'SAVE CHANGES' : 'CREATE SCHEDULE'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
