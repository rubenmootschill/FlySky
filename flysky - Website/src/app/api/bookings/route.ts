import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const toRad = (value: number) => (value * Math.PI) / 180

function isDispatchDataUnsupported(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const lowered = message.toLowerCase()
  return (
    lowered.includes('dispatchdata') &&
    (
      lowered.includes('unknown arg') ||
      lowered.includes('unknown argument') ||
      lowered.includes('does not exist') ||
      lowered.includes('p2022')
    )
  )
}

const calculateDistanceNm = (
  depLat: number,
  depLng: number,
  arrLat: number,
  arrLng: number,
) => {
  const R_KM = 6371
  const dLat = toRad(arrLat - depLat)
  const dLng = toRad(arrLng - depLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(depLat)) * Math.cos(toRad(arrLat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const km = R_KM * c
  return Math.max(1, Math.round(km * 0.539957))
}

async function resolveRouteForBooking(params: {
  routeId?: string
  depIcao?: string
  arrIcao?: string
  allowAdhocRoute?: boolean
  airlineId?: string | null
}) {
  if (params.routeId) {
    return prisma.route.findUnique({ where: { id: params.routeId } })
  }

  if (!params.allowAdhocRoute || !params.depIcao || !params.arrIcao) {
    return null
  }

  const depIcao = params.depIcao.trim().toUpperCase()
  const arrIcao = params.arrIcao.trim().toUpperCase()

  const existingRoute = await prisma.route.findFirst({
    where: {
      depIcao,
      arrIcao,
      ...(params.airlineId ? { airlineId: params.airlineId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existingRoute) return existingRoute

  const [depAirport, arrAirport, airline] = await Promise.all([
    prisma.airport.findUnique({ where: { icao: depIcao } }),
    prisma.airport.findUnique({ where: { icao: arrIcao } }),
    params.airlineId ? prisma.airline.findUnique({ where: { id: params.airlineId } }) : Promise.resolve(null),
  ])

  const depName = depAirport?.name ?? depIcao
  const arrName = arrAirport?.name ?? arrIcao
  const distance = depAirport && arrAirport
    ? calculateDistanceNm(depAirport.lat, depAirport.lng, arrAirport.lat, arrAirport.lng)
    : 250
  const flightTime = Math.max(30, Math.round((distance / 430) * 60))
  const prefix = airline?.callsignPrefix?.trim().toUpperCase() || 'JMP'
  const flightNumber = `${prefix}${Date.now().toString().slice(-6)}`

  return prisma.route.create({
    data: {
      flightNumber,
      airlineId: params.airlineId ?? null,
      depIcao,
      arrIcao,
      depIata: depAirport?.iata ?? null,
      arrIata: arrAirport?.iata ?? null,
      depName,
      arrName,
      distance,
      flightTime,
      aircraftType: null,
      active: true,
    },
  })
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
    if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })

    const payload = await req.json()
    const aircraftIcao = typeof payload?.aircraftIcao === 'string' ? payload.aircraftIcao.trim().toUpperCase() : ''
    const dispatchData = {
      callsign: typeof payload?.callsign === 'string' ? payload.callsign.trim() : '',
      flightNumber: typeof payload?.flightNumber === 'string' ? payload.flightNumber.trim() : '',
      costIndex: typeof payload?.costIndex === 'string' ? payload.costIndex.trim() : '',
      flightLevel: typeof payload?.flightLevel === 'string' ? payload.flightLevel.trim() : '',
      departureTime: typeof payload?.departureTime === 'string' ? payload.departureTime : null,
      arrivalTime: typeof payload?.arrivalTime === 'string' ? payload.arrivalTime : null,
      routing: typeof payload?.routing === 'string' ? payload.routing.trim() : '',
      network: typeof payload?.network === 'string' ? payload.network.trim() : '',
      copilot: typeof payload?.copilot === 'string' ? payload.copilot.trim() : '',
      passengers: typeof payload?.passengers === 'string' ? payload.passengers.trim() : '',
      passengersWithLuggage: typeof payload?.passengersWithLuggage === 'string' ? payload.passengersWithLuggage.trim() : '',
      freight: typeof payload?.freight === 'string' ? payload.freight.trim() : '',
      payloadKg: typeof payload?.payloadKg === 'number' && Number.isFinite(payload.payloadKg) ? payload.payloadKg : null,
      savedAt: new Date().toISOString(),
    }

    const selectedAircraft = aircraftIcao
      ? await prisma.aircraft.findFirst({
          where: {
            icaoCode: aircraftIcao,
            ...(pilot.airlineId ? { hub: pilot.hub } : {}),
          },
          select: { id: true },
        })
      : null

    const route = await resolveRouteForBooking({
      routeId: payload?.routeId,
      depIcao: payload?.depIcao,
      arrIcao: payload?.arrIcao,
      allowAdhocRoute: payload?.allowAdhocRoute,
      airlineId: pilot.airlineId,
    })
    if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    // Check for existing unused booking on same route
    const existing = await prisma.booking.findFirst({
      where: { pilotId: pilot.id, routeId: route.id, used: false },
    })
    if (existing) {
      try {
        await prisma.booking.update({
          where: { id: existing.id },
          data: {
            aircraftId: selectedAircraft?.id ?? existing.aircraftId ?? null,
            dispatchData,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      } catch (error) {
        if (!isDispatchDataUnsupported(error)) {
          throw error
        }

        // Compatibility fallback when DB/client has not picked up dispatchData yet.
        await prisma.booking.update({
          where: { id: existing.id },
          data: {
            aircraftId: selectedAircraft?.id ?? existing.aircraftId ?? null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }
      return NextResponse.json({ bookingId: existing.id, flightNumber: route.flightNumber })
    }

    let booking
    try {
      booking = await prisma.booking.create({
        data: {
          pilotId: pilot.id,
          routeId: route.id,
          aircraftId: selectedAircraft?.id ?? null,
          dispatchData,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      })
    } catch (error) {
      if (!isDispatchDataUnsupported(error)) {
        throw error
      }

      // Compatibility fallback when DB/client has not picked up dispatchData yet.
      booking = await prisma.booking.create({
        data: {
          pilotId: pilot.id,
          routeId: route.id,
          aircraftId: selectedAircraft?.id ?? null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      })
    }

    return NextResponse.json({ bookingId: booking.id, flightNumber: route.flightNumber }, { status: 201 })
  } catch (error) {
    console.error('Booking creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
    if (!pilot) return NextResponse.json([])

    const bookings = await prisma.booking.findMany({
      where: { pilotId: pilot.id, used: false },
      include: { route: true, aircraft: true },
      orderBy: { bookedAt: 'desc' },
    })
    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
