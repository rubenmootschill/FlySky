import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { z } from 'zod'

const addFleetSchema = z.object({
  fleetAircraftTypeId: z.string().min(1),
  count: z.number().int().min(1).max(100),
})

const removeFleetSchema = z.object({
  fleetAircraftTypeId: z.string().min(1),
})

export async function GET() {
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const fleet = await prisma.airlineFleet.findMany({
    where: { airlineId: airline.id },
    include: {
      fleetAircraftType: {
        select: { id: true, icaoCode: true, name: true, manufacturer: true, passengers: true, cargoVolume: true, cargoWeight: true, imageUrl: true },
      },
    },
    orderBy: { fleetAircraftType: { name: 'asc' } },
  })

  return Response.json(fleet)
}

export async function POST(request: Request) {
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const body = await request.json()
  const { fleetAircraftTypeId, count } = addFleetSchema.parse(body)

  // Verify aircraft type exists
  const aircraftType = await prisma.fleetAircraftType.findUnique({
    where: { id: fleetAircraftTypeId },
  })

  if (!aircraftType) return Response.json({ error: 'Aircraft type not found' }, { status: 404 })

  // Upsert fleet entry
  const fleet = await prisma.airlineFleet.upsert({
    where: {
      airlineId_fleetAircraftTypeId: {
        airlineId: airline.id,
        fleetAircraftTypeId,
      },
    },
    update: { count },
    create: {
      airlineId: airline.id,
      fleetAircraftTypeId,
      count,
    },
    include: { fleetAircraftType: true },
  })

  return Response.json(fleet, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const body = await request.json()
  const { fleetAircraftTypeId } = removeFleetSchema.parse(body)

  await prisma.airlineFleet.delete({
    where: {
      airlineId_fleetAircraftTypeId: {
        airlineId: airline.id,
        fleetAircraftTypeId,
      },
    },
  })

  return Response.json({ success: true })
}
