import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isAcarsAuthorized } from '@/lib/acars-auth'
import { scorePirep } from '@/lib/scoring'
import { notifyAirlineRadarEnded } from '@/lib/discord-notify'

const endSchema = z.object({
  sessionId: z.string().trim().min(10),
  pilotCallsign: z.string().trim().min(3).max(16),
  status: z.enum(['ENDED', 'ABORTED']).optional(),
  finalPhase: z.string().trim().min(2).max(32).optional(),
})

export async function POST(request: Request) {
  if (!(await isAcarsAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized ACARS client' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = endSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  const session = await (prisma as any).acarsFlightSession.findUnique({ where: { id: data.sessionId } })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.pilotCallsign !== data.pilotCallsign) {
    return NextResponse.json({ error: 'Session does not belong to this pilot' }, { status: 403 })
  }

  const endedAt = new Date()

  await (prisma as any).acarsFlightSession.update({
    where: { id: session.id },
    data: {
      status: data.status ?? 'ENDED',
      endedAt,
      lastSeenAt: endedAt,
    },
  })

  let autoPirepId: string | null = null
  let autoPirepSkippedReason: string | null = null

  try {
    const duplicateWindowStart = new Date(session.startedAt.getTime() - 5 * 60 * 1000)
    const duplicateWindowEnd = new Date(session.startedAt.getTime() + 5 * 60 * 1000)

    const existingPirep = await prisma.pirep.findFirst({
      where: {
        pilotId: session.pilotId,
        depIcao: session.depIcao,
        arrIcao: session.arrIcao,
        callsign: session.callsign,
        depTime: {
          gte: duplicateWindowStart,
          lte: duplicateWindowEnd,
        },
      },
      select: { id: true },
    })

    if (existingPirep) {
      autoPirepSkippedReason = 'duplicate'
    } else {
      const [matchedRoute, fallbackRoute] = await Promise.all([
        prisma.route.findFirst({
          where: {
            depIcao: session.depIcao,
            arrIcao: session.arrIcao,
            flightNumber: session.callsign,
            active: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.route.findFirst({
          where: {
            depIcao: session.depIcao,
            arrIcao: session.arrIcao,
            active: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
      ])

      const route = matchedRoute ?? fallbackRoute

      if (!route) {
        autoPirepSkippedReason = 'route_not_found'
      } else {
        const [firstPoint, lastPoint, touchdownPoint] = await Promise.all([
          (prisma as any).acarsTelemetryPoint.findFirst({
            where: { sessionId: session.id },
            orderBy: { recordedAt: 'asc' },
            select: { recordedAt: true, fuelTotalKg: true },
          }),
          (prisma as any).acarsTelemetryPoint.findFirst({
            where: { sessionId: session.id },
            orderBy: { recordedAt: 'desc' },
            select: {
              recordedAt: true,
              fuelTotalKg: true,
              groundSpeed: true,
              altitude: true,
              phase: true,
            },
          }),
          // Peak (most negative) VS while on the ground = landing FPM at touchdown
          (prisma as any).acarsTelemetryPoint.findFirst({
            where: {
              sessionId: session.id,
              onGround: true,
              verticalSpeed: { lt: 0 },
            },
            orderBy: { verticalSpeed: 'asc' }, // asc = most negative first
            select: { verticalSpeed: true },
          }),
        ])

        const depTime = session.startedAt
        const arrTime = endedAt
        const flightTimeMinutes = Math.max(1, Math.round((arrTime.getTime() - depTime.getTime()) / 60000))
        const landingRate = touchdownPoint?.verticalSpeed ?? null

        const fuelUsed =
          typeof firstPoint?.fuelTotalKg === 'number' && typeof lastPoint?.fuelTotalKg === 'number'
            ? Math.max(0, firstPoint.fuelTotalKg - lastPoint.fuelTotalKg)
            : null

        const { score, breakdown } = scorePirep({
          landingRate: landingRate ?? undefined,
          flightTime: flightTimeMinutes,
        })

        const pirep = await prisma.pirep.create({
          data: {
            pilotId: session.pilotId,
            routeId: route.id,
            aircraftId: null,
            bookingId: null,
            flightNumber: route.flightNumber || session.callsign,
            depIcao: session.depIcao,
            arrIcao: session.arrIcao,
            depTime,
            arrTime,
            flightTime: flightTimeMinutes,
            distance: route.distance,
            landingRate,
            fuelUsed,
            passengerCount: 0,
            network: session.network ?? 'offline',
            callsign: session.callsign,
            route: null,
            remarks: 'Auto-generated from ACARS session end. Review and edit if needed before acceptance.',
            score,
            scoreBreakdown: breakdown,
            acarsData: {
              autoGenerated: true,
              sessionId: session.id,
              finalPhase: data.finalPhase ?? lastPoint?.phase ?? null,
              maxAltitude: session.maxAltitude,
              maxGroundSpeed: session.maxGroundSpeed,
              startedAt: session.startedAt,
              endedAt,
            },
            status: 'PENDING',
          },
          select: { id: true },
        })

        autoPirepId = pirep.id
      }
    }
  } catch {
    autoPirepSkippedReason = 'auto_pirep_error'
  }

  await prisma.liveFlight.deleteMany({ where: { pilotId: session.pilotId } })

  const pilot = await prisma.pilot.findUnique({
    where: { id: session.pilotId },
    select: { airlineId: true, callsign: true },
  })

  if (pilot?.airlineId) {
    await notifyAirlineRadarEnded({
      airlineId: pilot.airlineId,
      pilotCallsign: pilot.callsign,
      callsign: session.callsign,
      depIcao: session.depIcao,
      arrIcao: session.arrIcao,
      status: data.status ?? 'ENDED',
    })
  }

  return NextResponse.json({
    ok: true,
    autoPirepCreated: !!autoPirepId,
    autoPirepId,
    autoPirepSkippedReason,
  })
}
