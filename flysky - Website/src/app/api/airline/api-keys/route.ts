import crypto from 'crypto'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { AIRLINE_API_SCOPES, AIRLINE_API_SCOPE_ENUM_MAP } from '@/lib/airline-api-scopes'
import { prisma } from '@/lib/prisma'

const createKeySchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  scopes: z.array(z.enum(AIRLINE_API_SCOPES)).min(1),
})

export async function GET() {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const keys = await prisma.airlineApiKey.findMany({
    where: {
      airlineId,
      revokedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return Response.json({
    keys: keys.map((key) => ({
      ...key,
      scopes: key.scopes.map((scope) => scope.toLowerCase()),
    })),
  })
}

export async function POST(req: Request) {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = createKeySchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  const airline = await prisma.airline.findUnique({
    where: { id: airlineId },
    select: { callsignPrefix: true },
  })

  if (!airline) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const airlinePrefix = airline.callsignPrefix.toLowerCase().replace(/[^a-z0-9]/g, '') || 'airline'
  const rawKey = `${airlinePrefix}_${crypto.randomBytes(24).toString('hex')}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

  const created = await prisma.airlineApiKey.create({
    data: {
      airlineId,
      name: parsed.data.name || 'Airline API Key',
      keyPrefix: `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`,
      keyHash,
      scopes: parsed.data.scopes.map((scope) => AIRLINE_API_SCOPE_ENUM_MAP[scope]) as any,
      createdByUserId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return Response.json({
    apiKey: rawKey,
    key: {
      ...created,
      scopes: created.scopes.map((scope) => scope.toLowerCase()),
    },
  })
}
