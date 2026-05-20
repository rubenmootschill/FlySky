'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Search } from 'lucide-react'

type RouteDetails = {
  id: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  depName: string
  arrName: string
  distance: number
  flightTime: number
  aircraftType: string | null
  active: boolean
  airline: {
    name: string
    callsignPrefix: string | null
  } | null
}

type AirlineFleetItem = {
  id: string
  fleetAircraftType: {
    icaoCode: string
    name: string
    manufacturer: string
  }
}

type DispatchDraft = {
  aircraft: string
  callsign: string
  flightNumber: string
  costIndex: string
  flightLevel: string
  departureTime: string
  arrivalTime: string
  routing: string
  network: string
  copilot: string
  passengers: string
  passengersWithLuggage: string
  freight: string
  simbriefPayloadKg: number | null
}

function formatFlightTime(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'N/A'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function toDatetimeLocal(value: string, fallback: string): string {
  const raw = (value || '').trim()
  if (!raw) return fallback

  // HHMM format (e.g. 1415)
  if (/^\d{4}$/.test(raw)) {
    const hours = Number(raw.slice(0, 2))
    const mins = Number(raw.slice(2, 4))
    if (Number.isFinite(hours) && Number.isFinite(mins)) {
      const base = new Date(fallback)
      base.setHours(hours, mins, 0, 0)
      return base.toISOString().slice(0, 16)
    }
  }

  // ISO or parseable date string
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 16)
  }

  return fallback
}

function toNumber(value: string): number {
  const parsed = Number((value || '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

export default function DispatchDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const routeId = (params?.id ?? '').trim()

  const { data: route, isLoading, isError } = useQuery<RouteDetails>({
    queryKey: ['dispatch-route-details', routeId],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${routeId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load dispatch route')
      }
      return data
    },
    enabled: Boolean(routeId),
  })

  const { data: pilot } = useQuery({
    queryKey: ['my-pilot'],
    queryFn: () => fetch('/api/pilot/me').then((r) => r.json()),
  })

  const { data: airlineFleet = [] } = useQuery<AirlineFleetItem[]>({
    queryKey: ['airline-fleet'],
    queryFn: async () => {
      const response = await fetch('/api/airline/fleet')
      if (!response.ok) return []
      return response.json()
    },
  })

  const [aircraft, setAircraft] = useState('')
  const [callsign, setCallsign] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [costIndex, setCostIndex] = useState('4')
  const [flightLevel, setFlightLevel] = useState('')
  const [departureTime, setDepartureTime] = useState(new Date().toISOString().slice(0, 16))
  const [arrivalTime, setArrivalTime] = useState(new Date().toISOString().slice(0, 16))
  const [routing, setRouting] = useState('')
  const [network, setNetwork] = useState('Offline')
  const [copilot, setCopilot] = useState('')
  const [passengers, setPassengers] = useState('113')
  const [passengersWithLuggage, setPassengersWithLuggage] = useState('85')
  const [freight, setFreight] = useState('960')
  const [simbriefPayloadKg, setSimbriefPayloadKg] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sbLoading, setSbLoading] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  const draftStorageKey = useMemo(() => `dispatch-draft:${routeId}`, [routeId])

  const routeInfo = useMemo(() => {
    if (!route) return null
    return {
      dep: route.depName,
      arr: route.arrName,
      distance: `${route.distance.toLocaleString()} NM`,
      type: route.active ? 'Scheduled' : 'Inactive',
      ete: formatFlightTime(route.flightTime),
      fn: route.flightNumber,
      cs: `${route.airline?.callsignPrefix?.toUpperCase() || 'VA'}${route.flightNumber}`,
    }
  }, [route])

  const aircraftOptions = useMemo(() => {
    const fromFleet = airlineFleet.map((item) => ({
      value: item.fleetAircraftType.icaoCode,
      label: `${item.fleetAircraftType.icaoCode} | ${item.fleetAircraftType.name}`,
    }))

    if (route?.aircraftType && !fromFleet.some((opt) => opt.value === route.aircraftType)) {
      fromFleet.unshift({
        value: route.aircraftType,
        label: `${route.aircraftType} | Scheduled type`,
      })
    }

    if (fromFleet.length === 0) {
      fromFleet.push({ value: 'B738', label: 'B738 | Boeing 737-800' })
    }

    return fromFleet
  }, [airlineFleet, route?.aircraftType])

  useEffect(() => {
    if (aircraft) return
    if (route?.aircraftType) {
      setAircraft(route.aircraftType)
      return
    }
    if (aircraftOptions.length > 0) {
      setAircraft(aircraftOptions[0].value)
    }
  }, [aircraft, route?.aircraftType, aircraftOptions])

  useEffect(() => {
    if (!routeId) return

    try {
      const raw = window.localStorage.getItem(draftStorageKey)
      if (!raw) {
        setDraftLoaded(true)
        return
      }

      const draft = JSON.parse(raw) as Partial<DispatchDraft>
      if (typeof draft.aircraft === 'string') setAircraft(draft.aircraft)
      if (typeof draft.callsign === 'string') setCallsign(draft.callsign)
      if (typeof draft.flightNumber === 'string') setFlightNumber(draft.flightNumber)
      if (typeof draft.costIndex === 'string') setCostIndex(draft.costIndex)
      if (typeof draft.flightLevel === 'string') setFlightLevel(draft.flightLevel)
      if (typeof draft.departureTime === 'string') setDepartureTime(draft.departureTime)
      if (typeof draft.arrivalTime === 'string') setArrivalTime(draft.arrivalTime)
      if (typeof draft.routing === 'string') setRouting(draft.routing)
      if (typeof draft.network === 'string') setNetwork(draft.network)
      if (typeof draft.copilot === 'string') setCopilot(draft.copilot)
      if (typeof draft.passengers === 'string') setPassengers(draft.passengers)
      if (typeof draft.passengersWithLuggage === 'string') setPassengersWithLuggage(draft.passengersWithLuggage)
      if (typeof draft.freight === 'string') setFreight(draft.freight)
      if (draft.simbriefPayloadKg === null || typeof draft.simbriefPayloadKg === 'number') {
        setSimbriefPayloadKg(draft.simbriefPayloadKg)
      }
    } catch {
      // Ignore malformed local draft data and continue with defaults.
    } finally {
      setDraftLoaded(true)
    }
  }, [draftStorageKey, routeId])

  useEffect(() => {
    if (!routeId || !draftLoaded) return

    const draft: DispatchDraft = {
      aircraft,
      callsign,
      flightNumber,
      costIndex,
      flightLevel,
      departureTime,
      arrivalTime,
      routing,
      network,
      copilot,
      passengers,
      passengersWithLuggage,
      freight,
      simbriefPayloadKg,
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [
    draftLoaded,
    draftStorageKey,
    routeId,
    aircraft,
    callsign,
    flightNumber,
    costIndex,
    flightLevel,
    departureTime,
    arrivalTime,
    routing,
    network,
    copilot,
    passengers,
    passengersWithLuggage,
    freight,
    simbriefPayloadKg,
  ])

  const displayedPayloadKg = useMemo(() => {
    if (simbriefPayloadKg !== null && Number.isFinite(simbriefPayloadKg) && simbriefPayloadKg > 0) {
      return simbriefPayloadKg
    }

    const paxTotal = Math.max(toNumber(passengers), toNumber(passengersWithLuggage))
    const withLuggage = Math.min(toNumber(passengersWithLuggage), paxTotal)
    const withoutLuggage = Math.max(paxTotal - withLuggage, 0)
    const freightKg = toNumber(freight)

    // Fallback estimate when SimBrief payload is unavailable.
    return withLuggage * 84 + withoutLuggage * 75 + freightKg
  }, [simbriefPayloadKg, passengers, passengersWithLuggage, freight])

  const handleCreateBooking = async (event: FormEvent) => {
    event.preventDefault()
    if (!route) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: route.id,
          aircraftIcao: aircraft || route.aircraftType || '',
          callsign: callsign || routeInfo?.cs || '',
          flightNumber: flightNumber || route.flightNumber || '',
          costIndex: costIndex || '4',
          flightLevel,
          departureTime,
          arrivalTime,
          routing: routing || `${route.depIcao.toUpperCase()} DCT ${route.arrIcao.toUpperCase()}`,
          network: network || 'Offline',
          copilot,
          passengers,
          passengersWithLuggage,
          freight,
          payloadKg: Math.round(displayedPayloadKg),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        alert(data?.error || 'Failed to create booking')
        return
      }

      const bookingId = data?.bookingId
      if (bookingId) {
        window.localStorage.removeItem(draftStorageKey)
        router.push(`/dashboard/booking/${bookingId}`)
      }
    } catch {
      alert('Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSimBriefClick = async () => {
    if (!route) return
    
    if (!pilot?.simBriefUser) {
      alert('Please set your SimBrief username in Settings first')
      return
    }
    
    setSbLoading(true)
    try {
      // Extract departure and arrival times from departureTime
      const depDate = new Date(departureTime)
      const depHour = depDate.getHours().toString().padStart(2, '0')
      const depMin = depDate.getMinutes().toString().padStart(2, '0')
      
      // Parse flight time to hours and minutes
      const steh = Math.floor(route.flightTime / 60)
      const stem = route.flightTime % 60
      
      // Request API code from backend (API key stays server-side)
      const outputpage = window.location.href.split('?')[0] // Current URL
      const authResponse = await fetch('/api/simbrief/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orig: route.depIcao,
          dest: route.arrIcao,
          type: aircraft || route.aircraftType || 'B738',
          outputpage,
        }),
      })

      if (!authResponse.ok) {
        const error = await authResponse.json()
        alert(error?.error || 'Failed to generate SimBrief authentication')
        return
      }

      const auth = await authResponse.json()

      // Build form with all flight parameters
      const form = document.createElement('form')
      form.method = 'GET'
      form.action = 'https://www.simbrief.com/ofp/ofp.loader.api.php'
      form.target = 'SimBriefWindow'
      form.style.display = 'none'

      const fields = {
        apicode: auth.apiCode,
        timestamp: auth.timestamp.toString(),
        outputpage: auth.outputpage,
        orig: auth.orig,
        dest: auth.dest,
        type: auth.type,
        airline: route.airline?.callsignPrefix?.toUpperCase() || 'VA',
        fltnum: route.flightNumber,
        deph: depHour,
        depm: depMin,
        steh: steh.toString(),
        stem: stem.toString(),
        pax: passengers,
        callsign: callsign || `${route.airline?.callsignPrefix?.toUpperCase() || 'VA'}${route.flightNumber}`,
        fl: flightLevel || 'AUTO',
        civalue: costIndex || '0',
        ...(routing && { route: routing }),
      }

      // Add form fields
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value as string
        form.appendChild(input)
      })

      // Open popup and submit form
      document.body.appendChild(form)
      const popup = window.open('about:blank', 'SimBriefWindow', 'width=800,height=600')
      
      if (popup) {
        form.submit()
        popup.focus()
        
        // Monitor popup closure and auto-fetch OFP data
        const checkPopupInterval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkPopupInterval)
            document.body.removeChild(form)
            
            // Auto-fetch OFP data after small delay (gives SimBrief time to process)
            setTimeout(async () => {
              try {
                let imported = false

                // SimBrief can take a few seconds to publish the latest OFP, so retry briefly.
                for (let attempt = 0; attempt < 3 && !imported; attempt += 1) {
                  const ofpResponse = await fetch('/api/simbrief/ofp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: pilot?.simBriefUser }),
                  })

                  if (!ofpResponse.ok) {
                    break
                  }

                  const ofpData = await ofpResponse.json()

                  // Auto-fill form with OFP data
                  if (ofpData.route) setRouting(ofpData.route)
                  if (ofpData.costIndex) setCostIndex(String(ofpData.costIndex))
                  if (ofpData.flightLevel) setFlightLevel(String(ofpData.flightLevel))
                  if (ofpData.callsign) {
                    setCallsign(String(ofpData.callsign))
                  } else if (ofpData.flightNumber) {
                    setCallsign(String(ofpData.flightNumber))
                  }
                  if (ofpData.flightNumber) setFlightNumber(String(ofpData.flightNumber))
                  if (ofpData.departureTime) {
                    setDepartureTime((prev) => toDatetimeLocal(String(ofpData.departureTime), prev))
                  }
                  if (ofpData.arrivalTime) {
                    setArrivalTime((prev) => toDatetimeLocal(String(ofpData.arrivalTime), prev))
                  }
                  if (ofpData.passengers) {
                    const pax = String(ofpData.passengers)
                    setPassengers(pax)
                    setPassengersWithLuggage(pax)
                  }
                  if (ofpData.cargo) setFreight(String(ofpData.cargo))
                  if (ofpData.payloadKg !== undefined && ofpData.payloadKg !== null) {
                    const payload = Number(ofpData.payloadKg)
                    if (Number.isFinite(payload) && payload > 0) {
                      setSimbriefPayloadKg(payload)
                    }
                  }

                  imported = Boolean(
                    ofpData.callsign ||
                    ofpData.flightNumber ||
                    ofpData.passengers ||
                    ofpData.cargo,
                  )

                  if (!imported && attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                  }
                }
              } catch (error) {
                console.error('Failed to fetch OFP:', error)
              }
            }, 2000)
          }
        }, 500)
      } else {
        document.body.removeChild(form)
        alert('Please disable your popup blocker to use SimBrief')
      }
    } catch (error) {
      console.error('SimBrief error:', error)
      alert('Failed to open SimBrief')
    } finally {
      setSbLoading(false)
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">Loading dispatch details...</div>
  }

  if (isError || !route || !routeInfo) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">Unable to load dispatch details.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div>
          <h1 className="section-title">Dispatch Details</h1>
          <p className="section-subtitle mt-1">{route.depName} to {route.arrName}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/routes/${route.id}`)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <form onSubmit={handleCreateBooking} className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Route Information</h2>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div>From: <span className="font-semibold">{routeInfo.dep}</span></div>
            <div>To: <span className="font-semibold">{routeInfo.arr}</span></div>
            <div>Distance: <span className="font-semibold">{routeInfo.distance}</span></div>
            <div>Type: <span className="font-semibold">{routeInfo.type}</span></div>
            <div>ETE: <span className="font-semibold">{routeInfo.ete}</span></div>
            <div>Flight No: <span className="font-semibold">{routeInfo.fn}</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Dispatch Details</h2>
            <button
              type="button"
              onClick={handleSimBriefClick}
              disabled={sbLoading}
              className="rounded-md bg-[#2d66e5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2050c0] disabled:opacity-60"
            >
              {sbLoading ? 'Generating...' : 'SimBrief'}
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-600">Aircraft
              <select value={aircraft} onChange={(e) => setAircraft(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {aircraftOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-600">Callsign
              <input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder={routeInfo.cs} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Flight Number
              <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder={routeInfo.fn} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Cost Index
              <input value={costIndex} onChange={(e) => setCostIndex(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Flight Level
              <input value={flightLevel} onChange={(e) => setFlightLevel(e.target.value)} placeholder="SimBrief will generate one if left empty" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Your Departure Time
              <input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Arrival Time
              <input type="datetime-local" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="mt-3 block text-xs text-slate-600">Routing
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={routing} onChange={(e) => setRouting(e.target.value)} className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
            </div>
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Flight Options</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-600">Network
              <select value={network} onChange={(e) => setNetwork(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option>Offline</option>
                <option>VATSIM</option>
                <option>IVAO</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">Preferred Network
              <input value={network} onChange={(e) => setNetwork(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Shared Cockpit Co-Pilot
              <input value={copilot} onChange={(e) => setCopilot(e.target.value)} placeholder="Select an option" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Payload</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-xs text-slate-600">Passengers
              <input value={passengers} onChange={(e) => setPassengers(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Passengers with Hold Luggage
              <input value={passengersWithLuggage} onChange={(e) => setPassengersWithLuggage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-slate-600">Freight
              <input value={freight} onChange={(e) => setFreight(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end text-xs text-slate-500">
              Payload: {new Intl.NumberFormat('en-US').format(Math.round(displayedPayloadKg))} kg
              {simbriefPayloadKg !== null ? ' (SimBrief)' : ' (estimated)'}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#345ed8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a4db4] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Booking...
            </>
          ) : (
            'Create Booking'
          )}
        </button>
      </form>
    </div>
  )
}
