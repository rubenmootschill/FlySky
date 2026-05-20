'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlaneTakeoff, PlaneLanding, Search, Navigation, Clock3, Building2, CheckCircle2, Shuffle, Wind, Cloud, Eye, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import BookFlightMap from '@/components/book/book-flight-map'

type Airline = {
  id: string
  name: string
  callsignPrefix: string
  icaoCode: string | null
  hub: string
  description: string | null
  logoUrl: string | null
  _count: { routes: number }
}

type Route = {
  id: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  depName: string
  arrName: string
  distance: number
  flightTime: number
  aircraftType: string | null
}

type Destination = {
  icao: string
  name: string
  distance: number
  durationMin: number
  lat: number | null
  lng: number | null
  aircraftTypes: string[]
  routeIds: string[]
  connections: number
}

const toRad = (deg: number) => (deg * Math.PI) / 180

const getGreatCircleDistanceNm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const earthRadiusKm = 6371
  const km = earthRadiusKm * c
  return km / 1.852
}

const estimateDurationMin = (distanceNm: number) => {
  if (!Number.isFinite(distanceNm) || distanceNm <= 0) return 0
  const cruiseSpeedKts = 440
  const blockBufferMin = 18
  return Math.max(25, Math.round((distanceNm / cruiseSpeedKts) * 60 + blockBufferMin))
}

export default function BookFlightPage() {
  const router = useRouter()
  const fmt = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`
  const [selectedDestinationIcao, setSelectedDestinationIcao] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [aircraftFilter, setAircraftFilter] = useState('')
  const [bookingAction, setBookingAction] = useState<'dispatch' | 'jump' | null>(null)
  const [jumpDisplayLeg, setJumpDisplayLeg] = useState<{ dep: string; arr: string } | null>(null)
  const [windEnabled, setWindEnabled] = useState(true)
  const [cloudEnabled, setCloudEnabled] = useState(false)
  const [visibilityEnabled, setVisibilityEnabled] = useState(true)
  const [rangeRingEnabled, setRangeRingEnabled] = useState(false)

  // Fetch current pilot info
  const { data: pilot } = useQuery({
    queryKey: ['current-pilot'],
    queryFn: () => fetch('/api/pilot/profile').then((r) => r.json()),
  })

  const { data: airlines = [], isLoading: loadingAirlines } = useQuery<Airline[]>({
    queryKey: ['user-airline', pilot?.airlineId],
    queryFn: () => 
      pilot?.airlineId
        ? fetch(`/api/airlines?id=${pilot.airlineId}`).then((r) => r.json())
        : Promise.resolve([]),
    enabled: !!pilot,
  })

  const selectedAirline = airlines[0] ?? null

  const { data: routes = [], isLoading: loadingRoutes } = useQuery<Route[]>({
    queryKey: ['routes', selectedAirline?.id],
    queryFn: () => fetch(`/api/routes?airlineId=${selectedAirline!.id}`).then((r) => r.json()),
    enabled: !!selectedAirline,
  })

  type NetworkAirport = {
    id: string
    tickets: number
    isHome: boolean
    createdAt: string
    airport: {
      id: string
      icao: string
      iata: string | null
      name: string
      city: string
      country: string
      lat?: number | null
      lng?: number | null
    }
  }

  const { data: networkData } = useQuery<{ airlineHub: string; airports: NetworkAirport[] }>({
    queryKey: ['airline-network', selectedAirline?.id],
    queryFn: () => fetch('/api/airline/airports').then((r) => r.json()),
    enabled: !!selectedAirline,
  })

  const hubIcao = (networkData?.airlineHub ?? '').trim().toUpperCase()
  const networkAirports = networkData?.airports ?? []

  // Find the home airport (departure point for flights)
  const homeAirport = networkAirports.find((ap) => ap.isHome)
  const departureIcao = homeAirport ? homeAirport.airport.icao.trim().toUpperCase() : hubIcao

  const destinations = useMemo<Destination[]>(() => {
    const byIcao = new Map<string, Destination>()

    // Add all network airports as destinations (excluding the departure airport)
    networkAirports.forEach((netAirport) => {
      const icao = netAirport.airport.icao.trim().toUpperCase()
      if (icao === departureIcao) return // Skip the departure airport itself

      byIcao.set(icao, {
        icao,
        name: netAirport.airport.name,
        distance: 0,
        durationMin: 0,
        lat: typeof netAirport.airport.lat === 'number' ? netAirport.airport.lat : null,
        lng: typeof netAirport.airport.lng === 'number' ? netAirport.airport.lng : null,
        aircraftTypes: [],
        routeIds: [],
        connections: 0,
      })
    })

    // Enrich with route data (distance, duration, aircraft, actual routes)
    routes.forEach((route) => {
      const dep = route.depIcao.trim().toUpperCase()
      const arr = route.arrIcao.trim().toUpperCase()
      
      // Routes from departure to destination
      if (dep === departureIcao && byIcao.has(arr)) {
        const dest = byIcao.get(arr)!
        dest.connections += 1
        dest.routeIds.push(route.id)
        if (dest.distance === 0 || route.distance < dest.distance) {
          dest.distance = route.distance
        }
        if (dest.durationMin === 0 || route.flightTime < dest.durationMin) {
          dest.durationMin = route.flightTime
        }
        if (route.aircraftType && !dest.aircraftTypes.includes(route.aircraftType)) {
          dest.aircraftTypes.push(route.aircraftType)
        }
      }
      // Routes to departure from destination (return routing)
      else if (arr === departureIcao && byIcao.has(dep)) {
        const dest = byIcao.get(dep)!
        dest.connections += 1
        dest.routeIds.push(route.id)
        if (dest.distance === 0 || route.distance < dest.distance) {
          dest.distance = route.distance
        }
        if (dest.durationMin === 0 || route.flightTime < dest.durationMin) {
          dest.durationMin = route.flightTime
        }
        if (route.aircraftType && !dest.aircraftTypes.includes(route.aircraftType)) {
          dest.aircraftTypes.push(route.aircraftType)
        }
      }
    })

    const departureAirport = networkAirports.find(
      (airport) => airport.airport.icao.trim().toUpperCase() === departureIcao,
    )
    const depLat = departureAirport?.airport.lat
    const depLng = departureAirport?.airport.lng

    if (typeof depLat === 'number' && typeof depLng === 'number') {
      byIcao.forEach((dest) => {
        if (typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return

        const geodesicDistance = getGreatCircleDistanceNm(depLat, depLng, dest.lat, dest.lng)
        if (!Number.isFinite(geodesicDistance) || geodesicDistance <= 0) return

        const roundedGeodesic = Math.round(geodesicDistance)
        const distanceMismatch =
          dest.distance > 0 ? Math.abs(dest.distance - roundedGeodesic) / Math.max(roundedGeodesic, 1) : 1

        // Prefer geodesic values when route data is missing or clearly inconsistent.
        if (dest.distance <= 0 || distanceMismatch > 0.35) {
          dest.distance = roundedGeodesic
        }

        const minimumReasonable = Math.round((dest.distance / 700) * 60)
        const maximumReasonable = Math.round((dest.distance / 250) * 60 + 120)
        const estimatedDuration = estimateDurationMin(dest.distance)

        if (
          dest.durationMin <= 0 ||
          dest.durationMin < minimumReasonable ||
          dest.durationMin > maximumReasonable
        ) {
          dest.durationMin = estimatedDuration
        }
      })
    }

    return Array.from(byIcao.values()).sort((a, b) => a.icao.localeCompare(b.icao))
  }, [networkAirports, routes, departureIcao])

  const filteredDestinations = destinations.filter((destination) => {
    const q = search.toLowerCase()
    const textMatch =
      !q ||
      destination.icao.toLowerCase().includes(q) ||
      destination.name.toLowerCase().includes(q)

    const aircraftMatch =
      !aircraftFilter ||
      destination.aircraftTypes.some((aircraft) => aircraft.toLowerCase().includes(aircraftFilter.toLowerCase()))

    return textMatch && aircraftMatch
  })

  useEffect(() => {
    if (!selectedDestinationIcao && filteredDestinations.length > 0) {
      setSelectedDestinationIcao(filteredDestinations[0].icao)
      return
    }

    if (
      selectedDestinationIcao &&
      !filteredDestinations.some((destination) => destination.icao === selectedDestinationIcao)
    ) {
      setSelectedDestinationIcao(filteredDestinations[0]?.icao ?? null)
    }
  }, [filteredDestinations, selectedDestinationIcao])

  const selectedDestination =
    filteredDestinations.find((destination) => destination.icao === selectedDestinationIcao) ?? null

  const routeSummary = useMemo(() => {
    if (jumpDisplayLeg) {
      return {
        dep: jumpDisplayLeg.dep,
        arr: jumpDisplayLeg.arr,
        distance: selectedDestination?.distance ?? 0,
        duration: fmt(selectedDestination?.durationMin ?? 0),
        aircraft: selectedDestination?.aircraftTypes[0] ?? 'Any',
      }
    }

    if (!selectedDestination) {
      return {
        dep: departureIcao || '----',
        arr: '----',
        distance: 0,
        duration: '0h 00m',
        aircraft: 'Any',
      }
    }

    return {
      dep: departureIcao || '----',
      arr: selectedDestination.icao,
      distance: selectedDestination.distance,
      duration: fmt(selectedDestination.durationMin),
      aircraft: selectedDestination.aircraftTypes[0] ?? 'Any',
    }
  }, [selectedDestination, departureIcao, jumpDisplayLeg])

  const activeJumpLeg = useMemo(() => {
    if (!selectedDestination) return null

    if (jumpDisplayLeg) {
      return {
        dep: jumpDisplayLeg.dep,
        arr: jumpDisplayLeg.arr,
      }
    }

    return {
      dep: selectedDestination.icao,
      arr: departureIcao,
    }
  }, [selectedDestination, departureIcao, jumpDisplayLeg])

  const jumpRoute = useMemo(() => {
    if (!activeJumpLeg) return null
    return findRouteForLeg(activeJumpLeg.dep, activeJumpLeg.arr)
  }, [activeJumpLeg, routes])

  const canJumpToHome = Boolean(activeJumpLeg && activeJumpLeg.dep !== activeJumpLeg.arr)

  const icaoQuery = Array.from(
    new Set([departureIcao, ...destinations.map((destination) => destination.icao)].filter(Boolean)),
  ).join(',')

  const { data: airports = [] } = useQuery<Array<{ icao: string; name: string; lat: number; lng: number }>>({
    queryKey: ['book-airports', icaoQuery],
    queryFn: () => fetch(`/api/tracking/airports?icao=${encodeURIComponent(icaoQuery)}`).then((r) => r.json()),
    enabled: icaoQuery.length > 0,
  })

  const airportsByIcao = Object.fromEntries(airports.map((airport) => [airport.icao.toUpperCase(), airport]))

  function findRouteForLeg(depIcao: string, arrIcao: string) {
    const dep = depIcao.trim().toUpperCase()
    const arr = arrIcao.trim().toUpperCase()
    const directMatches = routes.filter(
      (route) => route.depIcao.trim().toUpperCase() === dep && route.arrIcao.trim().toUpperCase() === arr,
    )

    if (directMatches.length === 0) return null

    // Prefer shortest direct leg when multiple schedules exist.
    return directMatches.reduce((best, current) => (current.distance < best.distance ? current : best), directMatches[0])
  }

  const submitBooking = async (
    payload: { routeId?: string; depIcao?: string; arrIcao?: string; allowAdhocRoute?: boolean },
    action: 'dispatch' | 'jump',
  ) => {
    setBookingAction(action)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setBookingAction(null)
    if (res.ok) {
      const bookingId = data.bookingId ?? data.id
      if (!bookingId) {
        toast.error('Booking created but no booking ID returned')
        return
      }

      if (action === 'dispatch') {
        setJumpDisplayLeg(null)
        const routeId = payload.routeId?.trim()
        if (!routeId) {
          toast.error('Flight booked but route ID is missing')
          return
        }
        toast.success('Flight dispatched! Opening route details...')
        router.push(`/dashboard/routes/${routeId}?bookingId=${bookingId}`)
      } else {
        if (payload.depIcao && payload.arrIcao) {
          const dep = payload.depIcao.trim().toUpperCase()
          const arr = payload.arrIcao.trim().toUpperCase()
          setJumpDisplayLeg({ dep: arr, arr: dep })
        }
        toast.success(`Jump booked: ${payload.depIcao ?? '----'} -> ${payload.arrIcao ?? '----'}`)
      }
    } else {
      toast.error(data.error ?? 'Booking failed')
    }
  }

  const bookDestination = async () => {
    if (!selectedDestination) {
      toast.error('Select a destination first')
      return
    }

    const outboundRoute = findRouteForLeg(departureIcao, selectedDestination.icao)
    if (!outboundRoute) {
      toast.error(`No direct route found from ${departureIcao} to ${selectedDestination.icao}`)
      return
    }

    setJumpDisplayLeg(null)
    await submitBooking({ routeId: outboundRoute.id }, 'dispatch')
  }

  const jumpToHome = async () => {
    if (!selectedDestination || !activeJumpLeg) {
      toast.error('Select a destination first')
      return
    }

    if (activeJumpLeg.dep === activeJumpLeg.arr) {
      toast.error('Jump leg is already complete')
      return
    }

    await submitBooking(
      {
        routeId: jumpRoute?.id,
        depIcao: activeJumpLeg.dep,
        arrIcao: activeJumpLeg.arr,
        allowAdhocRoute: true,
      },
      'jump',
    )
  }

  const openAirportInfo = (icao: string) => {
    const normalized = icao.trim().toUpperCase()
    if (normalized.length !== 4) {
      toast.error('Airport ICAO is not available yet')
      return
    }
    router.push(`/dashboard/airports/${normalized}`)
  }

  if (loadingAirlines || !pilot) {
    return <div className="card">Loading Book Flight...</div>
  }

  if (!pilot?.airlineId || !selectedAirline) {
    return (
      <div className="card text-center py-16">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="mb-4 text-slate-500">You are not assigned to an airline yet.</p>
        <button onClick={() => router.push('/dashboard/airlines')} className="btn-primary">
          Browse Airlines
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl bg-[#dfe7ef] p-3 md:p-4">
      <div className="mb-2 px-1">
        <h1 className="section-title">Book a Flight</h1>
        <p className="section-subtitle mt-1">
          {selectedAirline.name} · Home {departureIcao} · {filteredDestinations.length} destinations
        </p>
      </div>

      <div className="relative">
        <BookFlightMap
          hubIcao={departureIcao}
          destinations={destinations}
          airportsByIcao={airportsByIcao}
          selectedDestinationIcao={selectedDestinationIcao}
          onSelectDestination={setSelectedDestinationIcao}
          windEnabled={windEnabled}
          cloudEnabled={cloudEnabled}
          visibilityEnabled={visibilityEnabled}
          rangeRingEnabled={rangeRingEnabled}
        />

        <aside className="absolute left-3 top-3 z-[500] w-[280px] rounded-3xl border border-white/60 bg-[#d8e4ea]/90 p-4 shadow-xl backdrop-blur">
          <div className="text-[34px] leading-none text-slate-200">.</div>
          <div className="-mt-4 mb-2">
            <div className="text-[36px] leading-none text-transparent">.</div>
          </div>
          <div className="-mt-8 mb-4">
            <div className="text-4xl leading-none text-transparent">.</div>
          </div>

          <div className="-mt-14 mb-2">
            <div className="text-3xl leading-none text-transparent">.</div>
          </div>

          <div className="mb-4">
            <div className="text-[34px] leading-none text-transparent">.</div>
          </div>

          <div className="-mt-[160px] space-y-3">
            <div>
              <div className="text-[33px] leading-none text-transparent">.</div>
            </div>

            <div className="-mt-6">
              <h2 className="text-3xl font-extrabold text-slate-900">Book a Flight</h2>
              <p className="text-xs text-slate-500">Review route details</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                  <PlaneTakeoff className="h-3.5 w-3.5" /> Departure
                </div>
                <div className="mt-1 text-[30px] font-black tracking-tight text-slate-900">{routeSummary.dep}</div>
                <div className="text-xs text-slate-500">Hub</div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                  <PlaneLanding className="h-3.5 w-3.5" /> Arrival
                </div>
                <div className="mt-1 text-[30px] font-black tracking-tight text-slate-900">{routeSummary.arr}</div>
                <div className="text-xs text-slate-500">Destination</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (filteredDestinations.length === 0) return
                const random = filteredDestinations[Math.floor(Math.random() * filteredDestinations.length)]
                setJumpDisplayLeg(null)
                setSelectedDestinationIcao(random.icao)
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2.5 text-sm font-semibold text-white shadow"
            >
              <Shuffle className="h-4 w-4" /> Pick Random Destination
            </button>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="text-[10px] font-semibold uppercase text-slate-500">Aircraft</div>
                <div className="text-lg font-bold text-slate-900">{routeSummary.aircraft}</div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="text-[10px] font-semibold uppercase text-slate-500">Operator</div>
                <div className="text-lg font-bold text-slate-900">{selectedAirline.callsignPrefix}</div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="text-[10px] font-semibold uppercase text-slate-500">Duration</div>
                <div className="text-lg font-bold text-slate-900">{routeSummary.duration}</div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-2.5">
                <div className="text-[10px] font-semibold uppercase text-slate-500">Distance</div>
                <div className="text-lg font-bold text-slate-900">{routeSummary.distance.toLocaleString()} NM</div>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input bg-white/80 pl-9"
                placeholder="Search airport, city, flight"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              {[
                { label: 'Wind Speed', enabled: windEnabled, setEnabled: setWindEnabled, icon: Wind },
                { label: 'Cloud Layers', enabled: cloudEnabled, setEnabled: setCloudEnabled, icon: Cloud },
                { label: 'Surface Visibility', enabled: visibilityEnabled, setEnabled: setVisibilityEnabled, icon: Eye },
                { label: 'Range Rings', enabled: rangeRingEnabled, setEnabled: setRangeRingEnabled, icon: Navigation },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.setEnabled(!item.enabled)}
                  className="flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </span>
                  <span className={`inline-flex h-6 w-11 items-center rounded-full p-1 ${item.enabled ? 'bg-emerald-400' : 'bg-slate-300'}`}>
                    <span className={`h-4 w-4 rounded-full bg-white transition ${item.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={bookDestination}
              disabled={!selectedDestination || bookingAction !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-3 text-sm font-bold text-white shadow disabled:opacity-60"
            >
              {bookingAction === 'dispatch' ? 'Dispatching...' : 'Dispatch Flight'}
              <CheckCircle2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={jumpToHome}
              disabled={!canJumpToHome || bookingAction !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-3 text-sm font-bold text-slate-800 shadow disabled:opacity-60"
              title={
                activeJumpLeg && jumpRoute
                  ? 'Jump using scheduled return route'
                  : 'Jump with auto route if schedule does not exist'
              }
            >
              {bookingAction === 'jump'
                ? 'Jumping...'
                : activeJumpLeg && canJumpToHome
                  ? `Jump ${activeJumpLeg.dep} -> ${activeJumpLeg.arr}`
                  : `Jump unavailable`}
              <Navigation className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openAirportInfo(routeSummary.dep)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-sky-800 shadow"
              >
                <Info className="h-3.5 w-3.5" />
                {routeSummary.dep} Info
              </button>
              <button
                type="button"
                onClick={() => openAirportInfo(routeSummary.arr)}
                disabled={routeSummary.arr === '----'}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-sky-800 shadow disabled:opacity-60"
              >
                <Info className="h-3.5 w-3.5" />
                {routeSummary.arr} Info
              </button>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
