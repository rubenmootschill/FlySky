import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return NextResponse.json({ error: 'No airline found for this account' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
    include: {
      routes: { where: { active: true }, orderBy: { flightNumber: 'asc' } },
      _count: { select: { routes: { where: { active: true } } } },
    },
  })

  if (!airline) return NextResponse.json({ error: 'No airline found for this account' }, { status: 404 })
  return NextResponse.json(airline)
}
