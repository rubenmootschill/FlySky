import { getSession } from '@/lib/auth'
import { notifyAirlinePilotJoined } from '@/lib/discord-notify'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pilot: true },
    })

    if (!user?.pilot) {
      return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
    }

    const { airlineId } = await req.json()

    if (!airlineId) {
      return NextResponse.json({ error: 'Airline ID required' }, { status: 400 })
    }

    // Verify airline exists
    const airline = await prisma.airline.findUnique({ where: { id: airlineId } })
    if (!airline) {
      return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
    }

    const existingMembership = await (prisma as any).pilotAirlineMembership.findUnique({
      where: { pilotId_airlineId: { pilotId: user.pilot.id, airlineId } },
    })

    // Create membership (upsert to handle duplicates)
    await (prisma as any).pilotAirlineMembership.upsert({
      where: { pilotId_airlineId: { pilotId: user.pilot.id, airlineId } },
      create: { pilotId: user.pilot.id, airlineId },
      update: {},
    })

    if (!existingMembership) {
      await notifyAirlinePilotJoined({
        airlineId,
        airlineName: airline.name,
        callsign: user.pilot.callsign,
        firstName: user.pilot.firstName,
        lastName: user.pilot.lastName,
      })
    }

    // If pilot has no active airline, set this as active
    const updatedPilot = await prisma.pilot.update({
      where: { id: user.pilot.id },
      data: { airlineId: user.pilot.airlineId ?? airlineId },
    })

    return NextResponse.json(updatedPilot)
  } catch (error) {
    console.error('Failed to join airline:', error)
    return NextResponse.json({ error: 'Failed to join airline' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        pilot: {
          include: { memberships: { orderBy: { joinedAt: 'asc' } } },
        },
      },
    })

    if (!user?.pilot) {
      return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
    }

    const { airlineId } = await req.json()

    if (!airlineId) {
      return NextResponse.json({ error: 'Airline ID required' }, { status: 400 })
    }

    // Remove membership
    await (prisma as any).pilotAirlineMembership.deleteMany({
      where: { pilotId: user.pilot.id, airlineId },
    })

    // If this was the active airline, switch to another membership or set null
    let newActiveId: string | null = user.pilot.airlineId
    if (user.pilot.airlineId === airlineId) {
      const remaining = user.pilot.memberships.filter((m: any) => m.airlineId !== airlineId)
      newActiveId = remaining.length > 0 ? remaining[0].airlineId : null
    }

    const updatedPilot = await prisma.pilot.update({
      where: { id: user.pilot.id },
      data: { airlineId: newActiveId },
    })

    return NextResponse.json(updatedPilot)
  } catch (error) {
    console.error('Failed to leave airline:', error)
    return NextResponse.json({ error: 'Failed to leave airline' }, { status: 500 })
  }
}
