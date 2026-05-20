import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notifyPirepAccepted } from '@/lib/discord-notify'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action } = await req.json()
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const pirep = await prisma.pirep.findUnique({ where: { id } })
  if (!pirep) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED'

  await prisma.$transaction(async (tx) => {
    await tx.pirep.update({
      where: { id },
      data: { status, reviewedAt: new Date(), reviewedBy: session.user.id },
    })

    // Update pilot stats on acceptance
    if (action === 'accept') {
      const hoursFlown = pirep.flightTime / 60
      await tx.pilot.update({
        where: { id: pirep.pilotId },
        data: {
          totalFlights: { increment: 1 },
          totalHours: { increment: hoursFlown },
          totalPoints: { increment: pirep.score },
          totalLandings: { increment: 1 },
          lastFlightAt: pirep.arrTime,
        },
      })

      // Re-calculate average landing rate
      if (pirep.landingRate !== null) {
        const allPireps = await tx.pirep.findMany({
          where: { pilotId: pirep.pilotId, status: 'ACCEPTED', landingRate: { not: null } },
          select: { landingRate: true },
        })
        const avg = allPireps.reduce((sum, p) => sum + (p.landingRate ?? 0), 0) / allPireps.length
        await tx.pilot.update({
          where: { id: pirep.pilotId },
          data: { avgLandingRate: avg },
        })
      }

      // Check rank upgrade
      const pilot = await tx.pilot.findUnique({ where: { id: pirep.pilotId } })
      if (pilot) {
        const newRank = await tx.rank.findFirst({
          where: {
            minHours: { lte: pilot.totalHours },
            minFlights: { lte: pilot.totalFlights },
            minPoints: { lte: pilot.totalPoints },
          },
          orderBy: { order: 'desc' },
        })
        if (newRank && newRank.id !== pilot.rankId) {
          await tx.pilot.update({ where: { id: pilot.id }, data: { rankId: newRank.id } })
        }
      }
    }
  })

  if (action === 'accept') {
    const accepted = await prisma.pirep.findUnique({
      where: { id },
      include: {
        pilot: {
          select: {
            firstName: true,
            lastName: true,
            callsign: true,
            airlineId: true,
          },
        },
      },
    })

    if (accepted?.pilot) {
      await notifyPirepAccepted({
        pirepId: accepted.id,
        callsign: accepted.pilot.callsign,
        pilotName: `${accepted.pilot.firstName} ${accepted.pilot.lastName}`,
        flightNumber: accepted.flightNumber,
        depIcao: accepted.depIcao,
        arrIcao: accepted.arrIcao,
        score: accepted.score,
        airlineId: accepted.pilot.airlineId,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
