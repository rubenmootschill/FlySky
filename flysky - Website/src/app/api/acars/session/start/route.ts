import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isAcarsAuthorized } from '@/lib/acars-auth'
import { notifyAirlineRadarStarted } from '@/lib/discord-notify'

const startSchema = z.object({
  pilotCallsign: z.string().trim().min(3).max(16),
  callsign: z.string().trim().min(3).max(16),
  depIcao: z.string().trim().toUpperCase().length(4),
  arrIcao: z.string().trim().toUpperCase().length(4),
  aircraftType: z.string().trim().min(2).max(24).optional(),
  aircraftRegistration: z.string().trim().min(2).max(24).optional(),
  network: z.string().trim().min(2).max(16).optional(),
  lat: z.number(),
  lng: z.number(),
  altitude: z.number().int().optional(),
  heading: z.number().int().optional(),
  groundSpeed: z.number().int().optional(),
  verticalSpeed: z.number().int().optional(),
  phase: z.string().trim().min(2).max(32).optional(),
})

export async function POST(request: Request) {
  if (!(await isAcarsAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized ACARS client' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = startSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data
  const pilot = await prisma.pilot.findUnique({ where: { callsign: data.pilotCallsign } })
  if (!pilot) {
    return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
  }

  await (prisma as any).acarsFlightSession.updateMany({
    where: { pilotId: pilot.id, status: 'ACTIVE' },
    data: { status: 'ABORTED', endedAt: new Date() },
  })

  const session = await (prisma as any).acarsFlightSession.create({
    data: {
      pilotId: pilot.id,
      pilotCallsign: data.pilotCallsign,
      callsign: data.callsign,
      depIcao: data.depIcao,
      arrIcao: data.arrIcao,
      aircraftType: data.aircraftType,
      aircraftRegistration: data.aircraftRegistration,
      network: data.network,
      maxAltitude: data.altitude ?? 0,
      maxGroundSpeed: data.groundSpeed ?? 0,
    },
  })

  await (prisma as any).acarsTelemetryPoint.create({
    data: {
      sessionId: session.id,
      lat: data.lat,
      lng: data.lng,
      altitude: data.altitude ?? 0,
      heading: data.heading ?? 0,
      groundSpeed: data.groundSpeed ?? 0,
      verticalSpeed: data.verticalSpeed ?? 0,
      phase: data.phase ?? 'PREFLIGHT',
    },
  })

  const existingLive = await prisma.liveFlight.findFirst({ where: { pilotId: pilot.id } })
  if (existingLive) {
    await prisma.liveFlight.update({
      where: { id: existingLive.id },
      data: {
        callsign: data.callsign,
        depIcao: data.depIcao,
        arrIcao: data.arrIcao,
        lat: data.lat,
        lng: data.lng,
        altitude: data.altitude ?? 0,
        heading: data.heading ?? 0,
        groundSpeed: data.groundSpeed ?? 0,
        verticalSpeed: data.verticalSpeed ?? 0,
        phase: data.phase ?? 'PREFLIGHT',
      },
    })
  } else {
    await prisma.liveFlight.create({
      data: {
        pilotId: pilot.id,
        callsign: data.callsign,
        depIcao: data.depIcao,
        arrIcao: data.arrIcao,
        lat: data.lat,
        lng: data.lng,
        altitude: data.altitude ?? 0,
        heading: data.heading ?? 0,
        groundSpeed: data.groundSpeed ?? 0,
        verticalSpeed: data.verticalSpeed ?? 0,
        phase: data.phase ?? 'PREFLIGHT',
      },
    })
  }

  if (pilot.airlineId) {
    await notifyAirlineRadarStarted({
      airlineId: pilot.airlineId,
      pilotCallsign: pilot.callsign,
      callsign: data.callsign,
      depIcao: data.depIcao,
      arrIcao: data.arrIcao,
    })
  }

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    startedAt: session.startedAt,
  })
}
