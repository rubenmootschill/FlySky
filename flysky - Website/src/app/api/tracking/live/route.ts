import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const flights = await prisma.liveFlight.findMany({
    include: {
      pilot: { select: { callsign: true, firstName: true, lastName: true } },
      aircraft: { select: { icaoCode: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const activeSessions = await (prisma as any).acarsFlightSession.findMany({
    where: { status: 'ACTIVE' },
    select: {
      pilotId: true,
      aircraftType: true,
      telemetryPoints: {
        orderBy: { recordedAt: 'desc' },
        take: 180,
        select: { lat: true, lng: true },
      },
    },
  })

  const aircraftTypeByPilotId = new Map<string, string>()
  const trailPathByPilotId = new Map<string, Array<{ lat: number; lng: number }>>()

  for (const session of activeSessions as Array<{
    pilotId: string
    aircraftType?: string | null
    telemetryPoints: Array<{ lat: number; lng: number }>
  }>) {
    const type = session.aircraftType?.trim().toUpperCase()
    if (!type) continue
    if (!aircraftTypeByPilotId.has(session.pilotId)) {
      aircraftTypeByPilotId.set(session.pilotId, type)
    }

    if (!trailPathByPilotId.has(session.pilotId) && session.telemetryPoints.length > 1) {
      trailPathByPilotId.set(session.pilotId, [...session.telemetryPoints].reverse())
    }
  }

  const response = flights.map((flight) => ({
    ...flight,
    aircraftType: flight.aircraft?.icaoCode ?? aircraftTypeByPilotId.get(flight.pilotId) ?? null,
    trailPath: trailPathByPilotId.get(flight.pilotId) ?? null,
  }))

  return NextResponse.json(response)
}

export async function POST(req: Request) {
  // ACARS endpoint — update or create live flight position
  const body = await req.json()
  const { pilotCallsign, callsign, depIcao, arrIcao, lat, lng, altitude, heading, groundSpeed, verticalSpeed, phase } = body

  const pilot = await prisma.pilot.findUnique({ where: { callsign: pilotCallsign } })
  if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })

  const existing = await prisma.liveFlight.findFirst({ where: { pilotId: pilot.id } })
  if (existing) {
    await prisma.liveFlight.update({
      where: { id: existing.id },
      data: { lat, lng, altitude, heading, groundSpeed, verticalSpeed, phase, callsign },
    })
  } else {
    await prisma.liveFlight.create({
      data: { pilotId: pilot.id, callsign, depIcao, arrIcao, lat, lng, altitude, heading, groundSpeed, verticalSpeed: verticalSpeed ?? 0, phase },
    })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { pilotCallsign } = await req.json()
  const pilot = await prisma.pilot.findUnique({ where: { callsign: pilotCallsign } })
  if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
  await prisma.liveFlight.deleteMany({ where: { pilotId: pilot.id } })
  return NextResponse.json({ ok: true })
}
