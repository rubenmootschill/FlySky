import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('icao') ?? ''
  const icaos = Array.from(
    new Set(
      raw
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter((x) => x.length === 4),
    ),
  ).slice(0, 30)

  if (icaos.length === 0) {
    return NextResponse.json([])
  }

  const airports = await prisma.airport.findMany({
    where: {
      icao: { in: icaos },
    },
    select: {
      icao: true,
      name: true,
      lat: true,
      lng: true,
    },
  })

  return NextResponse.json(airports)
}
