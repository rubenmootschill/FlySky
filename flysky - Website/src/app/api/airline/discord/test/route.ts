import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { sendAirlineDiscordTestWebhook } from '@/lib/discord-notify'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await requireAuth()
  const airlineId = await resolveActiveAirlineId(session.user)

  if (!airlineId) {
    return Response.json({ error: 'Airline not found' }, { status: 404 })
  }

  const endpoint = await prisma.discordEndpoint.findFirst({
    where: {
      scope: 'AIRLINE',
      airlineId,
      enabled: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!endpoint?.webhookUrl) {
    return Response.json({ error: 'Please save a valid Discord webhook first.' }, { status: 400 })
  }

  try {
    await sendAirlineDiscordTestWebhook(endpoint.webhookUrl)

    await prisma.discordDeliveryLog.create({
      data: {
        endpointId: endpoint.id,
        eventType: 'PIREP_ACCEPTED',
        scope: 'AIRLINE',
        airlineId,
        status: 'DELIVERED',
        deliveredAt: new Date(),
        payload: { test: true },
      },
    })

    await prisma.discordEndpoint.update({
      where: { id: endpoint.id },
      data: {
        lastSuccessAt: new Date(),
        lastError: null,
      },
    })

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord test failed'

    await prisma.discordDeliveryLog.create({
      data: {
        endpointId: endpoint.id,
        eventType: 'PIREP_ACCEPTED',
        scope: 'AIRLINE',
        airlineId,
        status: 'FAILED',
        error: message,
        payload: { test: true },
      },
    })

    await prisma.discordEndpoint.update({
      where: { id: endpoint.id },
      data: { lastError: message },
    })

    return Response.json({ error: message }, { status: 500 })
  }
}
