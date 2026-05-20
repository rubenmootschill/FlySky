import { getSession } from '@/lib/auth'
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

    // Verify pilot is a member of this airline
    const membership = await (prisma as any).pilotAirlineMembership.findUnique({
      where: { pilotId_airlineId: { pilotId: user.pilot.id, airlineId } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this airline' }, { status: 403 })
    }

    const updatedPilot = await prisma.pilot.update({
      where: { id: user.pilot.id },
      data: { airlineId },
    })

    return NextResponse.json(updatedPilot)
  } catch (error) {
    console.error('Failed to select airline:', error)
    return NextResponse.json({ error: 'Failed to select airline' }, { status: 500 })
  }
}
