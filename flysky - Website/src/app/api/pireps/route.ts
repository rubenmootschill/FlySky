import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { scorePirep } from '@/lib/scoring'

const schema = z.object({
  bookingId: z.string(),
  depTime: z.string(),
  arrTime: z.string(),
  landingRate: z.string().optional(),
  fuelUsed: z.string().optional(),
  passengerCount: z.string().optional(),
  network: z.string().default('offline'),
  callsign: z.string().optional(),
  route: z.string().optional(),
  remarks: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
  if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })

  const body = await req.json()
  const data = schema.parse(body)

  const booking = await prisma.booking.findUnique({
    where: { id: data.bookingId },
    include: { route: true, aircraft: true },
  })

  if (!booking || booking.pilotId !== pilot.id || booking.used) {
    return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
  }

  const dep = new Date(data.depTime)
  const arr = new Date(data.arrTime)
  if (arr <= dep) {
    return NextResponse.json({ error: 'Arrival must be after departure' }, { status: 400 })
  }

  const flightTimeMinutes = Math.round((arr.getTime() - dep.getTime()) / 60000)
  const landingRate = data.landingRate ? parseFloat(data.landingRate) : undefined
  const { score, breakdown } = scorePirep({ landingRate, flightTime: flightTimeMinutes })

  const pirep = await prisma.$transaction(async (tx) => {
    const p = await tx.pirep.create({
      data: {
        pilotId: pilot.id,
        routeId: booking.routeId,
        aircraftId: booking.aircraftId ?? null,
        bookingId: booking.id,
        flightNumber: booking.route.flightNumber,
        depIcao: booking.route.depIcao,
        arrIcao: booking.route.arrIcao,
        depTime: dep,
        arrTime: arr,
        flightTime: flightTimeMinutes,
        distance: booking.route.distance,
        landingRate: landingRate ?? null,
        fuelUsed: data.fuelUsed ? parseFloat(data.fuelUsed) : null,
        passengerCount: parseInt(data.passengerCount ?? '0') || 0,
        network: data.network,
        callsign: data.callsign ?? null,
        route: data.route ?? null,
        remarks: data.remarks ?? null,
        score,
        scoreBreakdown: breakdown,
        status: 'PENDING',
      },
    })
    await tx.booking.update({ where: { id: booking.id }, data: { used: true } })
    return p
  })

  return NextResponse.json({ id: pirep.id }, { status: 201 })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
  if (!pilot) return NextResponse.json([])

  const pireps = await prisma.pirep.findMany({
    where: { pilotId: pilot.id },
    orderBy: { submittedAt: 'desc' },
    include: { route_ref: true, aircraft: true },
  })
  return NextResponse.json(pireps)
}
