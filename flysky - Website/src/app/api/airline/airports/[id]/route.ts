import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { z } from 'zod'

const updateAirlineAirportSchema = z.object({
  tickets: z.number().int().min(0).max(100).optional(),
  isHome: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })
    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const { id } = await params
    const body = await request.json()
    const updates = updateAirlineAirportSchema.parse(body)

    const existing = await prisma.airlineAirport.findFirst({
      where: { id, airlineId: airline.id },
    })

    if (!existing) return Response.json({ error: 'Airport not found in your network' }, { status: 404 })

    const updated = await prisma.$transaction(async (tx) => {
      if (updates.isHome === true) {
        await tx.airlineAirport.updateMany({
          where: { airlineId: airline.id, isHome: true },
          data: { isHome: false },
        })
      }

      return tx.airlineAirport.update({
        where: { id },
        data: updates,
        include: { airport: true },
      })
    })

    return Response.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid update values' }, { status: 400 })
    }
    return Response.json({ error: 'Failed to update airport' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })
    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const { id } = await params

    const existing = await prisma.airlineAirport.findFirst({
      where: { id, airlineId: airline.id },
    })

    if (!existing) return Response.json({ error: 'Airport not found in your network' }, { status: 404 })

    await prisma.airlineAirport.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: 'Failed to remove airport' }, { status: 500 })
  }
}
