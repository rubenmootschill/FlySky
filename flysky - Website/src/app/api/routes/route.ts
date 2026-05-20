import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const airlineId = searchParams.get('airlineId')

  const routes = await prisma.route.findMany({
    where: { active: true, ...(airlineId ? { airlineId } : {}) },
    orderBy: { flightNumber: 'asc' },
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
      airlineId: true,
      airline: { select: { name: true, callsignPrefix: true, logoUrl: true } },
    },
  })
  return NextResponse.json(routes)
}
