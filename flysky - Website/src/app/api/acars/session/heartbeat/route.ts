import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isAcarsAuthorized } from '@/lib/acars-auth'

const heartbeatSchema = z.object({
  sessionId: z.string().trim().min(10),
  pilotCallsign: z.string().trim().min(3).max(16),
  callsign: z.string().trim().min(3).max(16),
  lat: z.number(),
  lng: z.number(),
  altitude: z.number().int(),
  heading: z.number().int(),
  groundSpeed: z.number().int(),
  verticalSpeed: z.number().int(),
  phase: z.string().trim().min(2).max(32),
  pitch: z.number().optional(),
  bank: z.number().optional(),
  onGround: z.boolean().optional(),
  gearDown: z.boolean().optional(),
  flapsPct: z.number().optional(),
  fuelTotalKg: z.number().optional(),
  fuelFlowKgPerH: z.number().optional(),
  grossWeightKg: z.number().optional(),
  outsideTempC: z.number().optional(),
  windSpeedKts: z.number().int().optional(),
  windDirection: z.number().int().optional(),
})

export async function POST(request: Request) {
  if (!(await isAcarsAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized ACARS client' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = heartbeatSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  const session = await (prisma as any).acarsFlightSession.findUnique({ where: { id: data.sessionId } })
  if (!session || session.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session not active' }, { status: 404 })
  }

  if (session.pilotCallsign !== data.pilotCallsign) {
    return NextResponse.json({ error: 'Session does not belong to this pilot' }, { status: 403 })
  }

  await (prisma as any).acarsTelemetryPoint.create({
    data: {
      sessionId: session.id,
      lat: data.lat,
      lng: data.lng,
      altitude: data.altitude,
      heading: data.heading,
      groundSpeed: data.groundSpeed,
      verticalSpeed: data.verticalSpeed,
      phase: data.phase,
      pitch: data.pitch,
      bank: data.bank,
      onGround: data.onGround ?? false,
      gearDown: data.gearDown ?? false,
      flapsPct: data.flapsPct,
      fuelTotalKg: data.fuelTotalKg,
      fuelFlowKgPerH: data.fuelFlowKgPerH,
      grossWeightKg: data.grossWeightKg,
      outsideTempC: data.outsideTempC,
      windSpeedKts: data.windSpeedKts,
      windDirection: data.windDirection,
    },
  })

  await (prisma as any).acarsFlightSession.update({
    where: { id: session.id },
    data: {
      lastSeenAt: new Date(),
      maxAltitude: Math.max(session.maxAltitude, data.altitude),
      maxGroundSpeed: Math.max(session.maxGroundSpeed, data.groundSpeed),
    },
  })

  const existingLive = await prisma.liveFlight.findFirst({ where: { pilotId: session.pilotId } })
  if (existingLive) {
    await prisma.liveFlight.update({
      where: { id: existingLive.id },
      data: {
        callsign: data.callsign,
        lat: data.lat,
        lng: data.lng,
        altitude: data.altitude,
        heading: data.heading,
        groundSpeed: data.groundSpeed,
        verticalSpeed: data.verticalSpeed,
        phase: data.phase,
      },
    })
  }

  return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() })
}
