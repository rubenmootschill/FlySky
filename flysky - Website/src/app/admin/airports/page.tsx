'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Globe, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Airport {
  id: string
  icao: string
  iata?: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
  active: boolean
}

export default function AdminAirportsPage() {
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    icao: '',
    iata: '',
    name: '',
    city: '',
    country: '',
    lat: '',
    lng: '',
  })

  useEffect(() => {
    fetchAirports()
  }, [])

  const fetchAirports = async () => {
    try {
      const res = await fetch('/api/admin/airports')
      if (res.ok) {
        const data = await res.json()
        setAirports(data)
      }
    } catch (error) {
      console.error('Failed to fetch airports:', error)
      toast.error('Failed to load airports')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        const newAirport = await res.json()
        setAirports([newAirport, ...airports])
        setFormData({
          icao: '',
          iata: '',
          name: '',
          city: '',
          country: '',
          lat: '',
          lng: '',
        })
        setShowModal(false)
        toast.success('Airport added!')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add airport')
      }
    } catch (error) {
      console.error('Failed to add airport:', error)
      toast.error('Error adding airport')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove the airport.')) return
    try {
      const res = await fetch(`/api/admin/airports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAirports(airports.filter((a) => a.id !== id))
        toast.success('Airport deleted')
      } else {
        toast.error('Failed to delete airport')
      }
    } catch (error) {
      console.error('Failed to delete airport:', error)
      toast.error('Error deleting airport')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Airports</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Airport
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Airport</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">ICAO Code *</label>
                  <input
                    className="input font-mono uppercase"
                    placeholder="e.g. EGLL"
                    value={formData.icao}
                    onChange={(e) =>
                      setFormData({ ...formData, icao: e.target.value })
                    }
                    required
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="label">IATA Code</label>
                  <input
                    className="input font-mono uppercase"
                    placeholder="e.g. LHR"
                    value={formData.iata}
                    onChange={(e) =>
                      setFormData({ ...formData, iata: e.target.value })
                    }
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <label className="label">Airport Name *</label>
                <input
                  className="input"
                  placeholder="e.g. London Heathrow"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City *</label>
                  <input
                    className="input"
                    placeholder="e.g. London"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">Country *</label>
                  <input
                    className="input"
                    placeholder="e.g. United Kingdom"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="input"
                    placeholder="51.4700"
                    value={formData.lat}
                    onChange={(e) =>
                      setFormData({ ...formData, lat: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label">Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="input"
                    placeholder="-0.4543"
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({ ...formData, lng: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  Add Airport
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading airports...</div>
      ) : airports.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No airports yet. Add your first airport to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">ICAO</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">IATA</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Airport</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">City</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Country</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Coordinates</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {airports.map((airport) => (
                <tr
                  key={airport.id}
                  className="table-row-hover transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-sky-500">
                    {airport.icao}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {airport.iata || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {airport.name}
                  </td>
                  <td className="px-4 py-3 text-sm">{airport.city}</td>
                  <td className="px-4 py-3 text-sm">{airport.country}</td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">
                    {airport.lat.toFixed(4)}, {airport.lng.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        airport.active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {airport.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(airport.id)}
                      className="text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete airport"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
