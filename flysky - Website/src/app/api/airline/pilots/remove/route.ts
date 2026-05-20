import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pilotId } = await req.json()

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

    // Verify pilot belongs to this airline
    const pilot = await prisma.pilot.findUnique({
      where: { id: pilotId },
    })

    if (!pilot || pilot.airlineId !== airline.id) {
      return NextResponse.json({ error: 'Pilot not found in your airline' }, { status: 404 })
    }

    // Remove pilot from airline
    const updated = await prisma.pilot.update({
      where: { id: pilotId },
      data: { airlineId: null },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to remove pilot:', error)
    return NextResponse.json({ error: 'Failed to remove pilot' }, { status: 500 })
  }
}
