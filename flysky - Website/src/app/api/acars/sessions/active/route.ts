import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sessions = await (prisma as any).acarsFlightSession.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { lastSeenAt: 'desc' },
    include: {
      pilot: { select: { callsign: true, firstName: true, lastName: true } },
      telemetryPoints: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
      },
    },
  })

  const payload = sessions.map((s: any) => ({
    id: s.id,
    callsign: s.callsign,
    pilotCallsign: s.pilotCallsign,
    depIcao: s.depIcao,
    arrIcao: s.arrIcao,
    aircraftType: s.aircraftType,
    aircraftRegistration: s.aircraftRegistration,
    network: s.network,
    startedAt: s.startedAt,
    lastSeenAt: s.lastSeenAt,
    maxAltitude: s.maxAltitude,
    maxGroundSpeed: s.maxGroundSpeed,
    pilot: s.pilot,
    lastPoint: s.telemetryPoints[0]
      ? {
          recordedAt: s.telemetryPoints[0].recordedAt,
          lat: s.telemetryPoints[0].lat,
          lng: s.telemetryPoints[0].lng,
          altitude: s.telemetryPoints[0].altitude,
          heading: s.telemetryPoints[0].heading,
          groundSpeed: s.telemetryPoints[0].groundSpeed,
          verticalSpeed: s.telemetryPoints[0].verticalSpeed,
          phase: s.telemetryPoints[0].phase,
          fuelTotalKg: s.telemetryPoints[0].fuelTotalKg,
          outsideTempC: s.telemetryPoints[0].outsideTempC,
          windSpeedKts: s.telemetryPoints[0].windSpeedKts,
          windDirection: s.telemetryPoints[0].windDirection,
          onGround: s.telemetryPoints[0].onGround,
        }
      : null,
  }))

  return NextResponse.json(payload)
}
