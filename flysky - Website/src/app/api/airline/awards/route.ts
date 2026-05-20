import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { z } from 'zod'

const createAwardSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default('#f59e0b'),
  category: z.enum(['achievement', 'route', 'event']).default('achievement'),
})

const updateAwardSchema = createAwardSchema.extend({
  id: z.string().min(1),
})

export async function GET() {
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  // Get badges from the Badge model (for now, return all)
  // In future, we might add an AirlineBadge model to associate badges with airlines
  const badges = await prisma.badge.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      pilots: {
        where: {
          pilot: {
            user: {
              role: 'PILOT', // optional filter for pilots
            },
          },
        },
      },
    },
  })

  return Response.json(badges)
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
  const { name, description, color, category } = createAwardSchema.parse(body)

  const badge = await prisma.badge.create({
    data: {
      name,
      description,
      color,
      category,
    },
  })

  return Response.json(badge, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await requireAuth()

  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })

  if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

  const body = await request.json()
  const { id, name, description, color, category } = updateAwardSchema.parse(body)

  const existingBadge = await prisma.badge.findUnique({
    where: { id },
  })

  if (!existingBadge) {
    return Response.json({ error: 'Award not found' }, { status: 404 })
  }

  const badge = await prisma.badge.update({
    where: { id },
    data: {
      name,
      description,
      color,
      category,
    },
  })

  return Response.json(badge)
}
