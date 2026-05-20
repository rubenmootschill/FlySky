import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
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

const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  depIcao: icaoSchema,
  arrIcao: icaoSchema,
  imageUrl: imageSchema,
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } })
  if (!existingEvent || existingEvent.airlineId !== airlineId) {
    return Response.json({ error: 'Event not found' }, { status: 404 })
  }

  const payload = await request.json()
  const parsed = updateEventSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload', issues: parsed.error.errors }, { status: 400 })
  }

  const data = parsed.data
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      ...(data.depIcao !== undefined ? { depIcao: data.depIcao || null } : {}),
      ...(data.arrIcao !== undefined ? { arrIcao: data.arrIcao || null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })

  return Response.json(event)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const existingEvent = await prisma.event.findUnique({ where: { id } })
  if (!existingEvent || existingEvent.airlineId !== airlineId) {
    return Response.json({ error: 'Event not found' }, { status: 404 })
  }

  await prisma.event.delete({ where: { id } })

  return Response.json({ success: true })
}
