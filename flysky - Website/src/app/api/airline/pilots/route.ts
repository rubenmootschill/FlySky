import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) {
      return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
    }

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })

    if (!airline) {
      return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
    }

    // Get all pilots who are members of this airline (via membership table)
    const memberships = await (prisma as any).pilotAirlineMembership.findMany({
      where: { airlineId: airline.id },
      select: {
        pilot: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            callsign: true,
            status: true,
            totalFlights: true,
            totalHours: true,
            totalPoints: true,
            airlineId: true,
            rank: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { pilot: { totalFlights: 'desc' } },
    })
    const pilots = memberships.map((m: any) => ({
      ...m.pilot,
      isActive: m.pilot.airlineId === airline.id,
    }))

    return NextResponse.json(pilots)
  } catch (error) {
    console.error('Failed to fetch pilots:', error)
    return NextResponse.json({ error: 'Failed to fetch pilots' }, { status: 500 })
  }
}
