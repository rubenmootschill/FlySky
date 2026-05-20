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

  const booking = await prisma.booking.findFirst({
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
  })

  if (!booking) {
    return NextResponse.json({
      pilotCallsign,
      hasDispatch: false,
    })
  }

  return NextResponse.json({
    pilotCallsign,
    hasDispatch: true,
    bookingId: booking.id,
    bookedAt: booking.bookedAt,
    depIcao: booking.route.depIcao,
    arrIcao: booking.route.arrIcao,
    flightNumber: booking.route.flightNumber,
    aircraftType: booking.aircraft?.icaoCode ?? booking.route.aircraftType ?? null,
    aircraftRegistration: booking.aircraft?.registration ?? null,
  })
}
