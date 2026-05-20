import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { z } from 'zod'

const createAirlineAirportSchema = z.object({
  airportId: z.string().min(1),
  tickets: z.number().int().min(0).max(100).default(70),
  isHome: z.boolean().optional().default(false),
})

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })

    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')
    const search = searchParams.get('search')?.trim().toUpperCase() ?? ''

    if (mode === 'options') {
      const linked = await prisma.airlineAirport.findMany({
        where: { airlineId: airline.id },
        select: { airportId: true },
      })
      const linkedIds = linked.map((x) => x.airportId)

      const options = await prisma.airport.findMany({
        where: {
          active: true,
          id: { notIn: linkedIds.length > 0 ? linkedIds : undefined },
          OR: search
            ? [
                { icao: { contains: search } },
                { iata: { contains: search } },
                { name: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
              ]
            : undefined,
        },
        orderBy: { icao: 'asc' },
        take: 50,
      })

      return Response.json(options)
    }

    const network = await prisma.airlineAirport.findMany({
      where: { airlineId: airline.id },
      include: { airport: true },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({
      airlineHub: airline.hub,
      airports: network,
    })
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to load airports' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })

    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const body = await request.json()
    const { airportId, tickets, isHome } = createAirlineAirportSchema.parse(body)

    const airport = await prisma.airport.findUnique({ where: { id: airportId } })
    if (!airport) return Response.json({ error: 'Airport not found' }, { status: 404 })

    const created = await prisma.$transaction(async (tx) => {
      if (isHome) {
        await tx.airlineAirport.updateMany({
          where: { airlineId: airline.id, isHome: true },
          data: { isHome: false },
        })
      }

      return tx.airlineAirport.create({
        data: {
          airlineId: airline.id,
          airportId,
          tickets,
          isHome,
        },
        include: { airport: true },
      })
    })

    return Response.json(created, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid airport form values' }, { status: 400 })
    }
    if (error?.code === 'P2002') {
      return Response.json({ error: 'Airport already added to your network' }, { status: 400 })
    }
    return Response.json({ error: 'Failed to add airport' }, { status: 500 })
  }
}
