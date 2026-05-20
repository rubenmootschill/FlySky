import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { notifyAirlineEventPublished } from '@/lib/discord-notify'
import { prisma } from '@/lib/prisma'

const icaoSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().toUpperCase().length(4).nullable().optional(),
)

const imageSchema = z
  .preprocess((value) => (typeof value === 'string' ? value.trim() : value), z.string().optional())
  .refine(
    (value) => !value || value.startsWith('data:image/') || z.string().url().safeParse(value).success,
    'Image must be a valid URL or data:image file payload',
  )

const createEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(2000),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  depIcao: icaoSchema,
  arrIcao: icaoSchema,
  imageUrl: imageSchema,
})

export async function GET() {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const events = await prisma.event.findMany({
    where: { airlineId },
    orderBy: { startDate: 'asc' },
  })

  return Response.json(events)
}

export async function POST(request: Request) {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const payload = await request.json()
  const parsed = createEventSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload', issues: parsed.error.errors }, { status: 400 })
  }

  const data = parsed.data
  const event = await prisma.event.create({
    data: {
      airlineId,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      startDate: data.startDate,
      endDate: data.endDate,
      depIcao: data.depIcao ?? null,
      arrIcao: data.arrIcao ?? null,
    },
  })

  await notifyAirlineEventPublished({
    airlineId,
    title: event.title,
    startDate: event.startDate,
    depIcao: event.depIcao,
    arrIcao: event.arrIcao,
  })

  return Response.json(event, { status: 201 })
}
