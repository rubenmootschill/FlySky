'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plane } from 'lucide-react'
import BookFlightMap from '@/components/book/book-flight-map'

type BookingDetails = {
  id: string
  bookedAt: string
  expiresAt: string | null
  simBriefStaticId: string | null
  dispatchData?: {
    callsign?: string
    flightNumber?: string
    costIndex?: string
    flightLevel?: string
    departureTime?: string | null
    arrivalTime?: string | null
    routing?: string
    network?: string
    copilot?: string
    passengers?: string
    passengersWithLuggage?: string
    freight?: string
    payloadKg?: number | null
    savedAt?: string
  } | null
  route: {
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
  aircraft: {
    registration: string
    type: string
    icaoCode: string
  } | null
}

type TrackingAirport = {
  icao: string
  name: string
  lat: number
  lng: number
}

function formatHm(minutes: number) {
  const h = Math.floor(Math.max(minutes, 0) / 60)
  const m = Math.max(minutes, 0) % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default function BookingDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const bookingId = (params?.id ?? '').trim()

  const { data: booking, isLoading } = useQuery<BookingDetails>({
    queryKey: ['booking-details', bookingId],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load booking')
      }
      return data
    },
    enabled: Boolean(bookingId),
  })

  const route = booking?.route
  const dispatchData = booking?.dispatchData

  const savedCallsign = dispatchData?.callsign?.trim() || ''
  const savedFlightNumber = dispatchData?.flightNumber?.trim() || ''
  const effectiveFlightNumber = savedFlightNumber || route?.flightNumber || 'N/A'

  const airportQuery = useMemo(() => {
    if (!route) return ''
    return [route.depIcao, route.arrIcao]
      .map((icao) => icao.trim().toUpperCase())
      .filter(Boolean)
      .join(',')
  }, [route])

  const { data: mapAirports = [] } = useQuery<TrackingAirport[]>({
    queryKey: ['booking-map-airports', airportQuery],
    queryFn: async () => {
      const response = await fetch(`/api/tracking/airports?icao=${encodeURIComponent(airportQuery)}`)
      if (!response.ok) return []
      return response.json()
    },
    enabled: airportQuery.length > 0,
  })

  const airportsByIcao = useMemo(
    () => Object.fromEntries(mapAirports.map((airport) => [airport.icao.toUpperCase(), airport])),
    [mapAirports],
  )

  const mapDestinations = useMemo(() => {
    if (!route) return []
    return [
      {
        icao: route.arrIcao,
        name: route.arrName,
        distance: route.distance,
        durationMin: route.flightTime,
        aircraftTypes: route.aircraftType ? [route.aircraftType] : [],
        routeIds: [route.id],
        connections: 1,
      },
    ]
  }, [route])

  const depAirportName = useMemo(() => {
    if (!route) return ''
    const fromLookup = airportsByIcao[route.depIcao.toUpperCase()]?.name
    return fromLookup || route.depName
  }, [airportsByIcao, route])

  const arrAirportName = useMemo(() => {
    if (!route) return ''
    const fromLookup = airportsByIcao[route.arrIcao.toUpperCase()]?.name
    return fromLookup || route.arrName
  }, [airportsByIcao, route])

  const timeline = useMemo(() => {
    if (!route) return { std: '--:--', sta: '--:--', duration: '00:00' }

    const toHHmm = (isoLike?: string | null) => {
      if (!isoLike) return ''
      const parsed = new Date(isoLike)
      if (Number.isNaN(parsed.getTime())) return ''
      return `${parsed.getHours().toString().padStart(2, '0')}:${parsed.getMinutes().toString().padStart(2, '0')}`
    }

    const savedStd = toHHmm(dispatchData?.departureTime ?? null)
    const savedSta = toHHmm(dispatchData?.arrivalTime ?? null)
    if (savedStd && savedSta) {
      return { std: savedStd, sta: savedSta, duration: formatHm(route.flightTime) }
    }

    const now = new Date()
    const std = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const arr = new Date(now.getTime() + route.flightTime * 60 * 1000)
    const sta = `${arr.getHours().toString().padStart(2, '0')}:${arr.getMinutes().toString().padStart(2, '0')}`
    return { std, sta, duration: formatHm(route.flightTime) }
  }, [route, dispatchData?.departureTime, dispatchData?.arrivalTime])

  const displayCallsign = useMemo(() => {
    if (savedCallsign) return savedCallsign
    if (!route) return 'N/A'
    return route.flightNumber.startsWith('FIY') ? route.flightNumber : `FIY${route.flightNumber.replace(/\D/g, '')}`
  }, [route, savedCallsign])

  const routingText = useMemo(() => {
    if (!route) return 'N/A'
    const savedRouting = dispatchData?.routing?.trim()
    if (savedRouting) return savedRouting
    return `${route.depIcao.toUpperCase()} DCT ${route.arrIcao.toUpperCase()}`
  }, [route, dispatchData?.routing])

  const expiresText = useMemo(() => {
    if (!booking?.expiresAt) return null
    const expiry = new Date(booking.expiresAt)
    const diffMs = expiry.getTime() - Date.now()
    if (diffMs <= 0) return 'Booking window expired.'
    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return `Please start your flight before ${expiry.toLocaleString()} (${hours} hours ${mins} minutes from now).`
  }, [booking?.expiresAt])

  const hasGeneratedSimBriefOFP = Boolean(booking?.simBriefStaticId)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading booking...
        </div>
      </div>
    )
  }

  if (!booking || !route) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        Booking not found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-72">
          {airportsByIcao[route.depIcao.toUpperCase()] && airportsByIcao[route.arrIcao.toUpperCase()] ? (
            <BookFlightMap
              hubIcao={route.depIcao.toUpperCase()}
              destinations={mapDestinations}
              airportsByIcao={airportsByIcao}
              selectedDestinationIcao={route.arrIcao.toUpperCase()}
              onSelectDestination={() => {}}
              windEnabled={false}
              cloudEnabled={false}
              visibilityEnabled={false}
              rangeRingEnabled={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-300 via-sky-200 to-slate-100">
              <div className="rounded-xl border border-slate-200 bg-white/95 px-6 py-4 text-center shadow">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Route Preview</div>
                <div className="mt-1 text-3xl font-black text-slate-900">{route.depIcao} {'->'} {route.arrIcao}</div>
                <div className="text-xs text-slate-600">{route.depName} to {route.arrName}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {expiresText && (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
          {expiresText}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Flight Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Callsign | Flight Number</div>
                <div className="font-semibold text-slate-900">{displayCallsign} | {effectiveFlightNumber}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Departure</div>
                <div className="font-semibold text-slate-900">{route.depIcao}</div>
                <div className="text-slate-600">{depAirportName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Arrival</div>
                <div className="font-semibold text-slate-900">{route.arrIcao}</div>
                <div className="text-slate-600">{arrAirportName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Booking | Route Number</div>
                <div className="font-semibold text-slate-900">#{booking.id.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>

            <div className="mt-4 grid items-center gap-4 border-y border-slate-200 py-4 md:grid-cols-[1fr_auto_1fr]">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Departure</div>
                <div className="text-2xl font-semibold text-slate-900">{route.depIcao}</div>
                <div className="text-sm text-slate-600">{depAirportName}</div>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span className="h-px w-16 bg-slate-300" />
                <Plane className="h-5 w-5" />
                <span className="h-px w-16 bg-slate-300" />
              </div>
              <div className="text-left md:text-right">
                <div className="text-[10px] uppercase text-slate-500">Arrival</div>
                <div className="text-2xl font-semibold text-slate-900">{route.arrIcao}</div>
                <div className="text-sm text-slate-600">{arrAirportName}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">STD</div>
                <div className="font-semibold text-slate-900">{timeline.std}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Duration</div>
                <div className="font-semibold text-slate-900">{timeline.duration}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Distance</div>
                <div className="font-semibold text-slate-900">{route.distance.toLocaleString()} NM</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">STA</div>
                <div className="font-semibold text-slate-900">{timeline.sta}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-2 text-[11px] text-slate-500">
              <div>
                <span className="font-semibold uppercase">METAR </span>
                {route.depIcao} 121620Z AUTO 28012KT 250V310 CAVOK
              </div>
              <div className="md:text-right">
                <span className="font-semibold uppercase">METAR </span>
                {route.arrIcao} 121550Z 11006KT 070V230 9999 FEW045
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/airports/${route.depIcao.toUpperCase()}`)}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700"
              >
                Airport Information
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">Pilot Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-5 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Aircraft</div>
                <div className="font-semibold text-slate-900">{booking.aircraft?.registration || route.aircraftType || 'Assigned by fleet'}</div>
                <div className="text-slate-600">{booking.aircraft?.type || route.aircraftType || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Cost Index</div>
                <div className="font-semibold text-slate-900">{dispatchData?.costIndex?.trim() || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Passengers</div>
                <div className="font-semibold text-slate-900">{dispatchData?.passengers?.trim() || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Luggage</div>
                <div className="font-semibold text-slate-900">{dispatchData?.passengersWithLuggage?.trim() || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Freight</div>
                <div className="font-semibold text-slate-900">{dispatchData?.freight?.trim() ? `${dispatchData.freight.trim()} kg` : 'N/A'}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 border-t border-slate-200 pt-3 md:grid-cols-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Routing</div>
                <div className="font-semibold text-slate-900 break-words">{routingText}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Route Type</div>
                <div className="font-semibold text-slate-900">Scheduled</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Network</div>
                <div className="font-semibold text-slate-900">{dispatchData?.network?.trim() || 'Offline'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-500">Remarks</div>
                <div className="font-semibold text-slate-900">-</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700">Aircraft Information</button>
              <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700">Favorite</button>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-fit xl:sticky xl:top-20">
          <h2 className="text-sm font-semibold text-slate-900">Booking Actions</h2>
          <div className="mt-3 space-y-2">
            <button type="button" onClick={() => router.push(`/dashboard/dispatch/${route.id}`)} className="w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">Change Booking Details</button>
            <button
              type="button"
              onClick={() => {
                if (!hasGeneratedSimBriefOFP) router.push(`/dashboard/dispatch/${route.id}`)
              }}
              disabled={hasGeneratedSimBriefOFP}
              className="w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:bg-slate-100"
            >
              {hasGeneratedSimBriefOFP ? 'SimBrief OFP Generated' : 'Generate SimBrief OFP'}
            </button>
            <button type="button" className="w-full rounded-md border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">Make Additional Booking</button>
            <button type="button" onClick={() => router.push(`/dashboard/pireps/submit?bookingId=${booking.id}`)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manual PIREP / File a Claim</button>
            <button type="button" className="w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Cancel Booking</button>
            <button type="button" className="w-full rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Cancel & Rebook</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
