import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const updateScheduleSchema = z.object({
  flightNumber: z.string().min(1).max(10).optional(),
  depIcao: z.string().length(4).toUpperCase().optional(),
  arrIcao: z.string().length(4).toUpperCase().optional(),
  aircraftType: z.string().min(1).optional(),
  flightTime: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const route = await prisma.route.findUnique({
    where: { id },
  })

  if (!route || route.airlineId !== airline.id) {
    return Response.json({ error: 'Route not found' }, { status: 404 })
  }

  const body = await request.json()
  const { flightNumber, depIcao, arrIcao, aircraftType, flightTime, active } = updateScheduleSchema.parse(body)

  if (flightNumber && flightNumber !== route.flightNumber) {
    const existing = await prisma.route.findFirst({ where: { flightNumber } })
    if (existing) {
      return Response.json({ error: 'Flight number already exists' }, { status: 400 })
    }
  }

  const updated = await prisma.route.update({
    where: { id },
    data: {
      ...(flightNumber && { flightNumber }),
      ...(depIcao && { depIcao, depName: depIcao }),
      ...(arrIcao && { arrIcao, arrName: arrIcao }),
      ...(aircraftType && { aircraftType }),
      ...(flightTime !== undefined && { flightTime }),
      ...(active !== undefined && { active }),
    },
  })

  return Response.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const route = await prisma.route.findUnique({
    where: { id },
  })

  if (!route || route.airlineId !== airline.id) {
    return Response.json({ error: 'Route not found' }, { status: 404 })
  }

  try {
    await prisma.route.delete({
      where: { id },
    })
  } catch (error) {
    // Route may be referenced by bookings/PIREP records; archive instead of hard delete.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      await prisma.route.update({
        where: { id },
        data: { active: false },
      })

      return Response.json({ success: true, archived: true })
    }
    throw error
  }

  return Response.json({ success: true, archived: false })
}
