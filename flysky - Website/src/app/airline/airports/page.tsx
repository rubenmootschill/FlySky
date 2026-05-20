'use client'

import { useEffect, useMemo, useState } from 'react'
import { Home, MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

type AirportOption = {
  id: string
  icao: string
  iata?: string | null
  name: string
  city: string
  country: string
}

type NetworkAirport = {
  id: string
  tickets: number
  isHome: boolean
  createdAt: string
  airport: AirportOption
}

export default function AirlineAirportsPage() {
  const [loading, setLoading] = useState(true)
  const [networkAirports, setNetworkAirports] = useState<NetworkAirport[]>([])

  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [options, setOptions] = useState<AirportOption[]>([])
  const [selectedAirport, setSelectedAirport] = useState<AirportOption | null>(null)
  const [tickets, setTickets] = useState(70)
  const [isHome, setIsHome] = useState(false)

  const loadNetwork = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/airline/airports')
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to load airports')
        return
      }

      setNetworkAirports(data.airports)
    } catch (error) {
      toast.error('Failed to load airports')
    } finally {
      setLoading(false)
    }
  }

  const loadOptions = async (value: string) => {
    try {
      setSearching(true)
      const query = value.trim()
      const res = await fetch(`/api/airline/airports?mode=options&search=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to search airports')
        return
      }

      setOptions(data)
    } catch (error) {
      toast.error('Failed to search airports')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    loadNetwork()
  }, [])

  useEffect(() => {
    if (!showModal) return

    const timer = setTimeout(() => {
      loadOptions(search)
    }, 200)

    return () => clearTimeout(timer)
  }, [showModal, search])

  const openModal = () => {
    setShowModal(true)
    setSearch('')
    setSelectedAirport(null)
    setTickets(70)
    setIsHome(false)
    setOptions([])
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const addAirport = async () => {
    if (!selectedAirport) {
      toast.error('Select an airport first')
      return
    }

    try {
      const res = await fetch('/api/airline/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airportId: selectedAirport.id,
          tickets,
          isHome,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to add airport')
        return
      }

      toast.success('Airport added to your network')
      closeModal()
      loadNetwork()
    } catch (error) {
      toast.error('Failed to add airport')
    }
  }

  const removeAirport = async (id: string) => {
    if (!confirm('Remove this airport from your network?')) return

    try {
      const res = await fetch(`/api/airline/airports/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to remove airport')
        return
      }

      toast.success('Airport removed')
      loadNetwork()
    } catch (error) {
      toast.error('Failed to remove airport')
    }
  }

  const makeHome = async (id: string) => {
    try {
      const res = await fetch(`/api/airline/airports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHome: true }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to update home airport')
        return
      }

      toast.success('Home airport updated')
      loadNetwork()
    } catch (error) {
      toast.error('Failed to update home airport')
    }
  }

  const rows = useMemo(() => {
    return networkAirports.map((item, index) => {
      const networkId = (index + 1).toString(16).toUpperCase().padStart(2, '0')
      return { ...item, networkId }
    })
  }, [networkAirports])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="section-title">Airports</h1>
        <button onClick={openModal} className="btn-secondary text-xs sm:text-sm">
          <Plus className="w-4 h-4" />
          ADD AIRPORT
        </button>
      </div>

      {loading ? (
        <div className="card py-10 text-center text-slate-500">Loading airport network...</div>
      ) : rows.length === 0 ? (
        <div className="card py-12 text-center text-slate-500">No airports in your network yet. Add your first airport.</div>
      ) : (
        <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Network ID</th>
                  <th className="text-left px-4 py-3 font-medium">ICAO</th>
                  <th className="text-left px-4 py-3 font-medium">City</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Tickets</th>
                  <th className="text-left px-4 py-3 font-medium">Home</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  return (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-900/70 last:border-0">
                      <td className="px-4 py-3 text-slate-500 font-mono">{row.networkId}</td>
                      <td className="px-4 py-3 font-mono text-sky-500 font-semibold">{row.airport.icao}</td>
                      <td className="px-4 py-3 text-slate-500">{row.airport.city}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{row.airport.name}</td>
                      <td className="px-4 py-3 text-slate-500">{row.tickets}%</td>
                      <td className="px-4 py-3 text-slate-500">{row.isHome ? 'Yes' : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={() => makeHome(row.id)}
                            className={`transition-colors ${row.isHome ? 'text-sky-500' : 'text-slate-500 hover:text-sky-500'}`}
                            title="Set as home airport"
                          >
                            <Home className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeAirport(row.id)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                            title="Remove airport"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="w-full max-w-xl card p-0 max-h-[94vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Airport</h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setSelectedAirport(null)
                    }}
                    placeholder="Type airport name, city, ICAO or IATA"
                    className="input w-full pl-9"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Start typing airport name, city or ICAO code to search</p>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                {searching ? (
                  <div className="p-3 text-sm text-slate-500">Searching...</div>
                ) : options.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">No matching airports</div>
                ) : (
                  options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedAirport(option)}
                      className={`w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-900/60 ${selectedAirport?.id === option.id ? 'bg-sky-500/10' : ''}`}
                    >
                      <div className="font-mono text-sky-500 text-sm">{option.icao} {option.iata ? `(${option.iata})` : ''}</div>
                      <div className="text-sm text-slate-900 dark:text-white">{option.name}</div>
                      <div className="text-xs text-slate-500">{option.city}, {option.country}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tickets %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tickets}
                    onChange={(e) => setTickets(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Set As Home</label>
                  <button
                    type="button"
                    onClick={() => setIsHome((v) => !v)}
                    className={`h-11 w-full rounded-lg border text-sm ${isHome ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}
                  >
                    {isHome ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>

              {selectedAirport && (
                <div className="card p-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <MapPin className="w-4 h-4 text-sky-500" />
                    <span className="font-mono font-semibold">{selectedAirport.icao}</span>
                    <span className="text-slate-500">{selectedAirport.name}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="button" onClick={addAirport} className="btn-primary" disabled={!selectedAirport}>Add Airport</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
