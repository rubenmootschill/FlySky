import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { route: true, aircraft: true },
  })

  if (!booking || booking.pilotId !== pilot?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(booking)
}
