import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pilotId } = await req.json()

    // Get airline (owner only - admins can't transfer)
    const airline = await prisma.airline.findFirst({
      where: { ownerEmail: session.user.email },
    })

    if (!airline) {
      return NextResponse.json({ error: 'Airline not found or you are not the owner' }, { status: 404 })
    }

    // Get the new owner's email from the pilot
    const pilot = await prisma.pilot.findUnique({
      where: { id: pilotId },
      include: { user: true },
    })

    // Check pilot is a member of this airline (via membership table)
    const membership = await (prisma as any).pilotAirlineMembership.findUnique({
      where: { pilotId_airlineId: { pilotId, airlineId: airline.id } },
    })

    if (!pilot || !membership) {
      return NextResponse.json({ error: 'Pilot not found in your airline' }, { status: 404 })
    }

    // Transfer ownership
    const updated = await prisma.airline.update({
      where: { id: airline.id },
      data: { ownerEmail: pilot.user.email },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to transfer ownership:', error)
    return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 })
  }
}
