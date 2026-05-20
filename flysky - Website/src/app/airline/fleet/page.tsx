'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plane, Trash2, Plus, Search, X, AlertCircle, Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

type AircraftType = {
  id: string
  icaoCode: string
  name: string
  manufacturer: string
  passengers: number
  cargoVolume: number
  cargoWeight: number
  imageUrl?: string
}

type FleetItem = {
  id: string
  count: number
  fleetAircraftType: AircraftType
}

type LeaseStep = 1 | 2 | 3 | 4

type CabinPreset = 'balanced-three' | 'balanced-two' | 'balanced-economy' | 'high-density'

export default function AirlineFleetPage() {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [showLeaseModal, setShowLeaseModal] = useState(false)
  const [currentStep, setCurrentStep] = useState<LeaseStep>(1)
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('')
  const [registrationName, setRegistrationName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [activePreset, setActivePreset] = useState<CabinPreset>('balanced-three')
  const [cabin, setCabin] = useState({ first: 0, business: 0, economy: 0 })
  const [cargo, setCargo] = useState({ volume: 2, weight: 400 })
  const [weightUnit, setWeightUnit] = useState<'KGS' | 'LBS'>('KGS')
  const [weights, setWeights] = useState({ oew: '', mzfw: '', mtow: '', mlw: '' })

  useEffect(() => setMounted(true), [])

  // Fetch owned fleet
  const { data: fleet = [], isLoading: fleetLoading } = useQuery({
    queryKey: ['airline-fleet'],
    queryFn: () => fetch('/api/airline/fleet').then((r) => r.json()),
  })

  // Fetch available aircraft from admin catalog
  const { data: availableAircraft = [], isLoading: aircraftLoading } = useQuery({
    queryKey: ['available-aircraft'],
    queryFn: () => fetch('/api/admin/fleet').then((r) => r.json()),
  })

  // Add aircraft to fleet
  const addMutation = useMutation({
    mutationFn: (data: { fleetAircraftTypeId: string; count: number }) =>
      fetch('/api/airline/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-fleet'] })
      resetLeaseForm()
      setShowLeaseModal(false)
      toast.success('Aircraft added to fleet')
    },
    onError: () => toast.error('Failed to add aircraft'),
  })

  // Remove aircraft from fleet
  const removeMutation = useMutation({
    mutationFn: (fleetAircraftTypeId: string) =>
      fetch('/api/airline/fleet', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetAircraftTypeId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-fleet'] })
      toast.success('Aircraft removed from fleet')
    },
    onError: () => toast.error('Failed to remove aircraft'),
  })

  const selectedAircraft = useMemo(
    () => availableAircraft.find((ac: AircraftType) => ac.id === selectedAircraftId) ?? null,
    [availableAircraft, selectedAircraftId]
  )

  const filteredAircraft = useMemo(() => {
    if (!searchText.trim()) return availableAircraft
    const q = searchText.toLowerCase()
    return availableAircraft.filter((ac: AircraftType) => {
      return (
        ac.icaoCode.toLowerCase().includes(q) ||
        ac.name.toLowerCase().includes(q) ||
        ac.manufacturer.toLowerCase().includes(q)
      )
    })
  }, [availableAircraft, searchText])

  const maxSeats = selectedAircraft?.passengers ?? 12
  const totalCabinSeats = cabin.first + cabin.business + cabin.economy
  const cabinOverLimit = totalCabinSeats > maxSeats

  const applyPreset = (preset: CabinPreset) => {
    const seats = Math.max(maxSeats, 1)
    setActivePreset(preset)

    if (preset === 'balanced-three') {
      setCabin({
        first: Math.round(seats * 0.1),
        business: Math.round(seats * 0.25),
        economy: Math.max(0, seats - Math.round(seats * 0.1) - Math.round(seats * 0.25)),
      })
      return
    }

    if (preset === 'balanced-two') {
      setCabin({
        first: 0,
        business: Math.round(seats * 0.35),
        economy: Math.max(0, seats - Math.round(seats * 0.35)),
      })
      return
    }

    if (preset === 'balanced-economy') {
      setCabin({
        first: 0,
        business: Math.round(seats * 0.2),
        economy: Math.max(0, seats - Math.round(seats * 0.2)),
      })
      return
    }

    setCabin({
      first: 0,
      business: 0,
      economy: seats,
    })
  }

  const openLeaseModal = () => {
    resetLeaseForm()
    setShowLeaseModal(true)
  }

  const closeLeaseModal = () => {
    setShowLeaseModal(false)
    resetLeaseForm()
  }

  const resetLeaseForm = () => {
    setCurrentStep(1)
    setSelectedAircraftId('')
    setRegistrationName('')
    setSearchText('')
    setShowDropdown(false)
    setShowValidation(false)
    setActivePreset('balanced-three')
    setCabin({ first: 0, business: 0, economy: 0 })
    setCargo({ volume: 2, weight: 400 })
    setWeightUnit('KGS')
    setWeights({ oew: '', mzfw: '', mtow: '', mlw: '' })
  }

  const nextStep = () => {
    if (currentStep === 1) {
      if (!selectedAircraftId) {
        setShowValidation(true)
        toast.error('You must select an airframe')
        return
      }

      if (!registrationName.trim()) {
        toast.error('Please add aircraft name or registration')
        return
      }

      if (totalCabinSeats === 0) {
        applyPreset('balanced-three')
      }
    }

    if (currentStep === 2 && cabinOverLimit) {
      toast.error(`Cabin seats exceed capacity (${maxSeats})`)
      return
    }

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as LeaseStep)
    }
  }

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as LeaseStep)
    }
  }

  const handleLease = () => {
    if (!selectedAircraftId) {
      setCurrentStep(1)
      setShowValidation(true)
      toast.error('You must select an airframe')
      return
    }

    addMutation.mutate({ fleetAircraftTypeId: selectedAircraftId, count: 1 })
  }

  const stepMeta: Array<{ id: LeaseStep; title: string; description: string }> = [
    { id: 1, title: 'Basics', description: 'Select airframe and name' },
    { id: 2, title: 'Cabin Layout', description: 'Divide cabin into classes' },
    { id: 3, title: 'Cargo Limits', description: 'Configure max cargo limits' },
    { id: 4, title: 'Finish', description: 'Confirm details and lease aircraft' },
  ]

  const totalAircraft = fleet.reduce((sum: number, item: FleetItem) => sum + item.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Fleet</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetLeaseForm()
              setShowLeaseModal(true)
            }}
            className="btn-secondary text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            LEASE AIRCRAFT
          </button>
          <span className="text-sm text-slate-500">{totalAircraft} total aircraft</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Airframe</th>
                <th className="text-left px-4 py-3 font-medium">Manufacturer</th>
                <th className="text-left px-4 py-3 font-medium">Capacity</th>
                <th className="text-left px-4 py-3 font-medium">Stats</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fleetLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading fleet...
                  </td>
                </tr>
              ) : fleet.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No aircraft in fleet. Use LEASE AIRCRAFT to add your first airframe.
                  </td>
                </tr>
              ) : (
                fleet.map((item: FleetItem) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-900/70 last:border-0">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      <div className="font-medium">{item.fleetAircraftType.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sky-500 font-semibold">{item.fleetAircraftType.icaoCode}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.fleetAircraftType.manufacturer}</td>
                    <td className="px-4 py-3 text-slate-500">{item.fleetAircraftType.passengers} pax</td>
                    <td className="px-4 py-3 text-slate-500">{item.count} leased</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Remove all ${item.fleetAircraftType.icaoCode} aircraft from fleet?`)) {
                            removeMutation.mutate(item.fleetAircraftType.id)
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove from fleet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mounted && showLeaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 flex items-start sm:items-center justify-center overflow-y-auto">
          <div className="w-full max-w-4xl card p-0 max-h-[94vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lease Aircraft</h2>
              <button onClick={closeLeaseModal} className="text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label="Close lease modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-0 overflow-y-auto">
              <aside className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <div className="space-y-4">
                  {stepMeta.map((step) => {
                    const isActive = currentStep === step.id
                    const isDone = currentStep > step.id

                    return (
                      <div key={step.id} className="flex gap-3 items-start">
                        <div className={`mt-0.5 w-6 h-6 rounded-full border text-xs font-semibold flex items-center justify-center ${isDone ? 'bg-sky-500 border-sky-500 text-white' : isActive ? 'border-sky-500 text-sky-500 bg-sky-500/10' : 'border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isActive ? 'text-sky-500' : 'text-slate-700 dark:text-slate-200'}`}>{step.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{step.description}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </aside>

              <section className="p-5 sm:p-6 space-y-5 min-w-0">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Airframe</label>
                      <div className={`rounded-lg border ${showValidation && !selectedAircraftId ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-slate-50 dark:bg-slate-800`}>
                        <button
                          type="button"
                          onClick={() => setShowDropdown((v) => !v)}
                          className="w-full h-11 px-3 flex items-center justify-between text-left"
                        >
                          <span className={selectedAircraft ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}>
                            {selectedAircraft ? `${selectedAircraft.icaoCode} - ${selectedAircraft.name}` : 'Select airframe'}
                          </span>
                          <span className="text-slate-500">{showValidation && !selectedAircraftId ? <AlertCircle className="w-4 h-4 text-red-500" /> : <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />}</span>
                        </button>
                      </div>

                      {showValidation && !selectedAircraftId && <p className="text-xs text-red-500 mt-1">You must select airframe</p>}

                      {showDropdown && (
                        <div className="mt-2 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-500" />
                              <input
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Start typing to search"
                                className="input w-full h-9 pl-8"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredAircraft.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-slate-500">No matching airframes found</div>
                            ) : (
                              filteredAircraft.map((ac: AircraftType) => (
                                <button
                                  key={ac.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAircraftId(ac.id)
                                    setSearchText('')
                                    setShowDropdown(false)
                                    setShowValidation(false)
                                    applyPreset(activePreset)
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-sky-500 font-semibold font-mono">{ac.icaoCode}</div>
                                      <div className="text-slate-900 dark:text-slate-200 text-sm">{ac.name}</div>
                                    </div>
                                    <div className="text-xs text-slate-500">{ac.manufacturer}</div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label">Aircraft Name Or Registration</label>
                      <input
                        value={registrationName}
                        onChange={(e) => setRegistrationName(e.target.value.slice(0, 60))}
                        placeholder="Aircraft name or registration"
                        className="input w-full"
                      />
                      <div className="text-[11px] text-slate-500 mt-1 text-right">{registrationName.length}/60</div>
                    </div>

                    <div>
                      <label className="label">SimBrief Custom Airframe ID (Optional)</label>
                      <input
                        value={weights.oew}
                        onChange={(e) => setWeights((prev) => ({ ...prev, oew: e.target.value }))}
                        placeholder="Internal ID / profile override"
                        className="input w-full"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-sm text-slate-500">Capacity: <span className="font-semibold text-slate-900 dark:text-slate-200">{maxSeats} seats</span></div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => applyPreset('balanced-three')} type="button" className={`px-3 py-1.5 rounded-md text-xs border ${activePreset === 'balanced-three' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>Balanced 3 Class</button>
                      <button onClick={() => applyPreset('balanced-two')} type="button" className={`px-3 py-1.5 rounded-md text-xs border ${activePreset === 'balanced-two' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>Balanced 2 Class</button>
                      <button onClick={() => applyPreset('balanced-economy')} type="button" className={`px-3 py-1.5 rounded-md text-xs border ${activePreset === 'balanced-economy' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>Balanced Economy</button>
                      <button onClick={() => applyPreset('high-density')} type="button" className={`px-3 py-1.5 rounded-md text-xs border ${activePreset === 'high-density' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>High Density</button>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-300">First class</span><span className="font-mono text-slate-900 dark:text-white">{cabin.first}</span></div>
                        <input type="range" min={0} max={maxSeats - cabin.business - cabin.economy} value={cabin.first} onChange={(e) => setCabin((prev) => ({ ...prev, first: Number(e.target.value) }))} className="w-full accent-sky-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-300">Business class</span><span className="font-mono text-slate-900 dark:text-white">{cabin.business}</span></div>
                        <input type="range" min={0} max={maxSeats - cabin.first - cabin.economy} value={cabin.business} onChange={(e) => setCabin((prev) => ({ ...prev, business: Number(e.target.value) }))} className="w-full accent-emerald-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-300">Economy class</span><span className="font-mono text-slate-900 dark:text-white">{cabin.economy}</span></div>
                        <input type="range" min={0} max={maxSeats - cabin.first - cabin.business} value={cabin.economy} onChange={(e) => setCabin((prev) => ({ ...prev, economy: Number(e.target.value) }))} className="w-full accent-amber-500" />
                      </div>
                    </div>

                    <div className={`text-sm ${cabinOverLimit ? 'text-red-500' : 'text-slate-500'}`}>
                      Total: <span className="font-semibold">{totalCabinSeats}</span> / {maxSeats}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-300">Cargo Volume (m³)</span><span className="font-mono text-slate-900 dark:text-white">{cargo.volume} m³</span></div>
                      <input type="range" min={0} max={selectedAircraft?.cargoVolume || 20} step={1} value={cargo.volume} onChange={(e) => setCargo((prev) => ({ ...prev, volume: Number(e.target.value) }))} className="w-full accent-sky-500" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-300">Cargo Weight ({weightUnit})</span><span className="font-mono text-slate-900 dark:text-white">{cargo.weight} {weightUnit.toLowerCase()}</span></div>
                      <input type="range" min={0} max={selectedAircraft?.cargoWeight || 40000} step={1} value={cargo.weight} onChange={(e) => setCargo((prev) => ({ ...prev, weight: Number(e.target.value) }))} className="w-full accent-emerald-500" />
                    </div>

                    <div>
                      <label className="label">Weight Unit</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setWeightUnit('KGS')} className={`px-3 py-1.5 rounded-md text-xs border ${weightUnit === 'KGS' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>KGS</button>
                        <button type="button" onClick={() => setWeightUnit('LBS')} className={`px-3 py-1.5 rounded-md text-xs border ${weightUnit === 'LBS' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>LBS</button>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="card p-4">
                        <div className="text-slate-500 mb-1">Name</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{registrationName}</div>
                      </div>
                      <div className="card p-4">
                        <div className="text-slate-500 mb-1">Model</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{selectedAircraft ? `${selectedAircraft.icaoCode} - ${selectedAircraft.name}` : '—'}</div>
                      </div>
                    </div>
                    <div className="card p-4 text-sm">
                      <div className="mb-2 text-slate-500">Cabin</div>
                      <div className="font-mono text-slate-900 dark:text-white">F {cabin.first} · C {cabin.business} · Y {cabin.economy}</div>
                    </div>
                    <div className="card p-4 text-sm">
                      <div className="mb-2 text-slate-500">Cargo</div>
                      <div className="font-mono text-slate-900 dark:text-white">{cargo.volume} m³ / {cargo.weight} {weightUnit.toLowerCase()}</div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button type="button" onClick={currentStep === 1 ? closeLeaseModal : previousStep} className="btn-secondary">
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {currentStep < 4 ? (
                    <button type="button" onClick={nextStep} className="btn-primary" disabled={aircraftLoading}>
                      Next
                    </button>
                  ) : (
                    <button type="button" onClick={handleLease} className="btn-primary" disabled={addMutation.isPending}>
                      {addMutation.isPending ? 'Leasing...' : 'Lease Aircraft'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
