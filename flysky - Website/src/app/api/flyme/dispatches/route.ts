import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAcarsAuthorized } from '@/lib/acars-auth'

export async function GET(request: Request) {
  if (!(await isAcarsAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized ACARS client' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pilotCallsign = (searchParams.get('pilotCallsign') ?? '').trim().toUpperCase()
  if (!pilotCallsign) {
    return NextResponse.json({ error: 'pilotCallsign is required' }, { status: 400 })
  }

  const pilot = await prisma.pilot.findUnique({ where: { callsign: pilotCallsign } })
  if (!pilot) {
    return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
  }

  const bookings = await prisma.booking.findMany({
    where: {
      pilotId: pilot.id,
      used: false,
      route: { active: true },
    },
    include: {
      route: true,
      aircraft: true,
    },
    orderBy: { bookedAt: 'desc' },
    take: 12,
  })

  return NextResponse.json({
    pilotCallsign,
    hasDispatch: bookings.length > 0,
    dispatches: bookings.map((booking) => ({
      id: booking.id,
      bookedAt: booking.bookedAt,
      expiresAt: booking.expiresAt,
      simBriefStaticId: booking.simBriefStaticId,
      route: {
        id: booking.route.id,
        flightNumber: booking.route.flightNumber,
        depIcao: booking.route.depIcao,
        arrIcao: booking.route.arrIcao,
        depName: booking.route.depName,
        arrName: booking.route.arrName,
        distance: booking.route.distance,
        flightTime: booking.route.flightTime,
        aircraftType: booking.route.aircraftType,
      },
      aircraft: booking.aircraft
        ? {
            registration: booking.aircraft.registration,
            type: booking.aircraft.type,
            icaoCode: booking.aircraft.icaoCode,
          }
        : null,
    })),
  })
}