import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { z } from 'zod'

const createScheduleSchema = z.object({
  flightNumber: z.string().min(1).max(10),
  depIcao: z.string().length(4).toUpperCase(),
  arrIcao: z.string().length(4).toUpperCase(),
  aircraftType: z.string().min(1).optional(),
  flightTime: z.number().int().min(1).optional(),
})

const updateScheduleSchema = z.object({
  depIcao: z.string().length(4).toUpperCase().optional(),
  arrIcao: z.string().length(4).toUpperCase().optional(),
  aircraftType: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export async function GET(request: Request) {
  const session = await requireAuth()
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const schedules = await prisma.route.findMany({
    where: {
      airlineId: airline.id,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: { flightNumber: 'asc' },
  })

  return Response.json(schedules)
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth()

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })

    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const body = await request.json()
    const { flightNumber, depIcao, arrIcao, aircraftType, flightTime } = createScheduleSchema.parse(body)

    if (depIcao === arrIcao) {
      return Response.json({ error: 'Departure and arrival airports must be different' }, { status: 400 })
    }

    const existing = await prisma.route.findFirst({
      where: { flightNumber },
    })

    if (existing) return Response.json({ error: 'Flight number already exists' }, { status: 400 })

    const route = await prisma.route.create({
      data: {
        flightNumber,
        depIcao,
        arrIcao,
        depName: depIcao,
        arrName: arrIcao,
        distance: 0,
        flightTime: flightTime ?? 60,
        aircraftType: aircraftType || null,
        airlineId: airline.id,
      },
    })

    return Response.json(route, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid schedule data' }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
