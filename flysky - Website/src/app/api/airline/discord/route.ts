import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { AIRLINE_DISCORD_EVENT_KEYS, type AirlineDiscordEventKey } from '@/lib/discord-events'
import { prisma } from '@/lib/prisma'

const eventKeySchema = z.enum(AIRLINE_DISCORD_EVENT_KEYS)
const airlineEventKeySet = new Set<string>(AIRLINE_DISCORD_EVENT_KEYS)

const updateSchema = z.object({
  webhookUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
  events: z.record(z.string(), z.boolean()).optional(),
})

function defaultEventMap() {
  return Object.fromEntries(AIRLINE_DISCORD_EVENT_KEYS.map((eventKey) => [eventKey, false])) as Record<(typeof AIRLINE_DISCORD_EVENT_KEYS)[number], boolean>
}

export async function GET() {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const endpoint = await prisma.discordEndpoint.findFirst({
    where: {
      scope: 'AIRLINE',
      airlineId,
    },
    include: {
      subscriptions: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const events = defaultEventMap()
  for (const sub of endpoint?.subscriptions ?? []) {
    if (airlineEventKeySet.has(sub.eventType)) {
      events[sub.eventType as keyof typeof events] = sub.enabled
    }
  }

  return Response.json({
    hasWebhook: Boolean(endpoint?.webhookUrl),
    webhookPreview: endpoint?.webhookUrl ? `${endpoint.webhookUrl.slice(0, 35)}...` : null,
    enabled: endpoint?.enabled ?? false,
    events,
    lastSuccessAt: endpoint?.lastSuccessAt ?? null,
    lastError: endpoint?.lastError ?? null,
  })
}

export async function PUT(req: Request) {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const payload = await req.json()
  const parsed = updateSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload' }, { status: 400 })
  }

  const data = parsed.data
  const filteredEvents = Object.fromEntries(
    Object.entries(data.events ?? {}).filter(([eventType]) => airlineEventKeySet.has(eventType)),
  ) as Partial<Record<AirlineDiscordEventKey, boolean>>

  let endpoint = await prisma.discordEndpoint.findFirst({
    where: {
      scope: 'AIRLINE',
      airlineId,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!endpoint) {
    endpoint = await prisma.discordEndpoint.create({
      data: {
        scope: 'AIRLINE',
        airlineId,
        name: 'Primary Airline Discord',
        webhookUrl: data.webhookUrl ?? '',
        enabled: data.enabled ?? true,
      },
    })
  } else {
    endpoint = await prisma.discordEndpoint.update({
      where: { id: endpoint.id },
      data: {
        ...(data.webhookUrl !== undefined ? { webhookUrl: data.webhookUrl } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      },
    })
  }

  if (Object.keys(filteredEvents).length > 0) {
    for (const [eventType, enabled] of Object.entries(filteredEvents)) {
      const typedEventType = eventType as AirlineDiscordEventKey
      await prisma.discordSubscription.upsert({
        where: {
          endpointId_eventType: {
            endpointId: endpoint.id,
            eventType: typedEventType as any,
          },
        },
        update: { enabled },
        create: {
          endpointId: endpoint.id,
          eventType: typedEventType as any,
          enabled,
        },
      })
    }
  }

  return Response.json({ ok: true })
}
