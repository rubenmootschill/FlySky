import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!id?.trim()) {
    return NextResponse.json({ error: 'Route ID is required' }, { status: 400 })
  }

  const route = await prisma.route.findUnique({
    where: { id },
    select: {
      id: true,
      flightNumber: true,
      depIcao: true,
      arrIcao: true,
      depName: true,
      arrName: true,
      distance: true,
      flightTime: true,
      aircraftType: true,
      active: true,
      airline: { select: { name: true, callsignPrefix: true } },
    },
  })

  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  }

  return NextResponse.json(route)
}
