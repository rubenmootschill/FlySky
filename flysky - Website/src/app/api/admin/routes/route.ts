import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdmin()
    const airports = await prisma.airport.findMany({
      orderBy: { icao: 'asc' },
    })
    return NextResponse.json(airports)
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    const airport = await prisma.airport.create({
      data: {
        icao: body.icao.toUpperCase(),
        iata: body.iata?.toUpperCase() || null,
        name: body.name,
        city: body.city,
        country: body.country,
        lat: parseFloat(body.lat),
        lng: parseFloat(body.lng),
        active: body.active ?? true,
      },
    })

    return NextResponse.json(airport)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create airport' },
      { status: 400 }
    )
  }
}
