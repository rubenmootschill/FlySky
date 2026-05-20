import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { notifyAirlineNotamPublished } from '@/lib/discord-notify'
import { prisma } from '@/lib/prisma'

const createNotamSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(5).max(5000),
  severity: z.enum(['INFO', 'ADVISORY', 'WARNING', 'CRITICAL']).default('INFO'),
})

export async function GET() {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const notams = await prisma.airlineNotam.findMany({
    where: { airlineId },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(notams)
}

export async function POST(request: Request) {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const payload = await request.json()
  const parsed = createNotamSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  const data = parsed.data
  const notam = await prisma.airlineNotam.create({
    data: {
      airlineId,
      title: data.title,
      body: data.body,
      severity: data.severity,
    },
  })

  await notifyAirlineNotamPublished({
    airlineId,
    title: notam.title,
    severity: notam.severity,
  })

  return Response.json(notam, { status: 201 })
}
