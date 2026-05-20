'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Loader2, X, Plane, Navigation, Gauge, Mountain, Radio, Hash, UserRound, Compass, Clock3 } from 'lucide-react'
import { useTheme } from 'next-themes'

const LiveMap = dynamic(() => import('@/components/tracking/live-map'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full min-h-[420px] bg-slate-900 rounded-xl border border-slate-800">
    <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
  </div>
)})

interface LiveFlight {
  id: string
  callsign: string
  aircraftType?: string | null
  routeText?: string | null
  routePath?: Array<{ lat: number; lng: number }> | null
  trailPath?: Array<{ lat: number; lng: number }> | null
  depIcao: string
  arrIcao: string
  lat: number
  lng: number
  altitude: number
  groundSpeed: number
  heading: number
  phase: string
  pilot: { callsign: string; firstName: string; lastName: string }
}

interface AirportPoint {
  icao: string
  lat: number
  lng: number
  name: string
}

function toRad(value: number) {
  return (value * Math.PI) / 180
}

function distanceNmBetweenPoints(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusNm = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusNm * c
}

export default function TrackingPage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [airportsByIcao, setAirportsByIcao] = useState<Record<string, AirportPoint>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [aircraftPhotoUrl, setAircraftPhotoUrl] = useState<string | null>(null)
  const [aircraftPhotoLoading, setAircraftPhotoLoading] = useState(false)
  const mapTheme = theme === 'light' ? 'light' : 'dark'
  const selectedFlight = selected ? flights.find((flight) => flight.id === selected) ?? null : null

  const depAirport = selectedFlight ? airportsByIcao[selectedFlight.depIcao.toUpperCase()] : undefined
  const arrAirport = selectedFlight ? airportsByIcao[selectedFlight.arrIcao.toUpperCase()] : undefined
  const remainingNm = selectedFlight && arrAirport
    ? Math.max(0, Math.round(distanceNmBetweenPoints(selectedFlight.lat, selectedFlight.lng, arrAirport.lat, arrAirport.lng)))
    : null
  const pilotName = selectedFlight ? `${selectedFlight.pilot.firstName} ${selectedFlight.pilot.lastName}` : ''

  const fetchFlights = async () => {
    const liveRes = await fetch('/api/tracking/live')

    if (liveRes.ok) {
      const liveFlights: LiveFlight[] = await liveRes.json()
      setFlights(liveFlights)

      const icaos = Array.from(
        new Set(
          liveFlights
            .flatMap((flight) => [flight.depIcao, flight.arrIcao])
            .map((icao) => icao.trim().toUpperCase())
            .filter((icao) => icao.length === 4),
        ),
      )

      if (icaos.length > 0) {
        const airportsRes = await fetch(`/api/tracking/airports?icao=${encodeURIComponent(icaos.join(','))}`)
        if (airportsRes.ok) {
          const airports: AirportPoint[] = await airportsRes.json()
          const next = airports.reduce<Record<string, AirportPoint>>((acc, airport) => {
            acc[airport.icao.toUpperCase()] = airport
            return acc
          }, {})
          setAirportsByIcao(next)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetchFlights()
    const interval = setInterval(fetchFlights, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selectedFlight) {
      setAircraftPhotoUrl(null)
      setAircraftPhotoLoading(false)
      return
    }

    const controller = new AbortController()

    const loadAircraftPhoto = async () => {
      setAircraftPhotoLoading(true)
      try {
        const response = await fetch(
          `/api/tracking/aircraft-photo?callsign=${encodeURIComponent(selectedFlight.callsign)}&depIcao=${encodeURIComponent(selectedFlight.depIcao)}&arrIcao=${encodeURIComponent(selectedFlight.arrIcao)}`,
          { signal: controller.signal },
        )
        if (!response.ok) {
          setAircraftPhotoUrl(null)
          return
        }

        const payload: { photoUrl?: string | null } = await response.json()
        setAircraftPhotoUrl(payload.photoUrl ?? null)
      } catch {
        if (!controller.signal.aborted) {
          setAircraftPhotoUrl(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setAircraftPhotoLoading(false)
        }
      }
    }

    loadAircraftPhoto()

    return () => {
      controller.abort()
    }
  }, [selectedFlight?.id, selectedFlight?.callsign, selectedFlight?.depIcao, selectedFlight?.arrIcao])

  if (!mounted) {
    return (
      <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-10rem)] overflow-hidden">
        <div className="h-full min-h-[420px] bg-slate-900 rounded-xl border border-slate-800" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-10rem)] overflow-hidden">
      {/* Map */}
      <div className="relative h-full">
        <LiveMap flights={flights} airportsByIcao={airportsByIcao} selectedId={selected} onSelect={setSelected} theme={mapTheme} />

        {selectedFlight ? (
          <aside className="absolute top-4 left-4 z-20 w-[340px] max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 backdrop-blur shadow-xl">
            <div className="relative h-44 overflow-hidden rounded-t-xl border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
              {aircraftPhotoUrl ? (
                <img
                  src={aircraftPhotoUrl}
                  alt={`${selectedFlight.callsign} aircraft`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {aircraftPhotoLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <Plane className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 z-10 inline-flex items-center justify-center rounded-md border border-white/40 bg-black/20 p-1.5 text-white/95 backdrop-blur hover:bg-black/35"
                aria-label="Close flight details"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute left-3 bottom-3 z-10">
                <div className="text-2xl font-bold leading-none text-white">{selectedFlight.callsign}</div>
                <div className="text-sm font-medium text-white/90">{pilotName}</div>
              </div>
            </div>

            <div className="space-y-3 p-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Departure</div>
                  <div className="text-lg font-semibold leading-none text-slate-900">{selectedFlight.depIcao}</div>
                  <div className="truncate text-xs text-slate-500">{depAirport?.name ?? 'Unknown airport'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-right">
                  <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Arrival</div>
                  <div className="text-lg font-semibold leading-none text-slate-900">{selectedFlight.arrIcao}</div>
                  <div className="truncate text-xs text-slate-500">{arrAirport?.name ?? 'Unknown airport'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{selectedFlight.phase}</div>
                    <div className="text-2xl font-semibold leading-none text-slate-900">{selectedFlight.aircraftType ?? 'A/C'}</div>
                  </div>
                  <Plane className="h-8 w-8 text-sky-600" />
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium">{remainingNm !== null ? `${remainingNm.toLocaleString()} NM remaining` : 'Route in progress'}</span>
                  <span className="font-bold tracking-[0.06em] text-sky-600">LIVE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Radio className="h-3.5 w-3.5" /> Callsign
                  </div>
                  <div className="mt-1 text-xl font-semibold leading-none text-slate-900">{selectedFlight.callsign}</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Hash className="h-3.5 w-3.5" /> Flight Number
                  </div>
                  <div className="mt-1 text-xl font-semibold leading-none text-slate-900">{selectedFlight.callsign}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                  <UserRound className="h-3.5 w-3.5" /> Pilot
                </div>
                <div className="mt-1 text-2xl font-semibold leading-tight text-slate-900">{pilotName}</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Compass className="h-3.5 w-3.5" /> Heading
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{selectedFlight.heading}&deg;</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Gauge className="w-3.5 h-3.5" /> Ground Speed
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{selectedFlight.groundSpeed} kts</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Navigation className="w-3.5 h-3.5" /> Phase
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{selectedFlight.phase}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" /> Updated
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">Live</div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    <Mountain className="h-3.5 w-3.5" /> Altitude
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{selectedFlight.altitude.toLocaleString()} ft</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Aircraft</div>
                <div className="mt-1 text-lg font-semibold leading-tight text-slate-900">{selectedFlight.aircraftType ?? 'Unknown type'}</div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
