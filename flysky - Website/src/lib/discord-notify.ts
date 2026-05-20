import type { Phase2DiscordEventKey } from '@/lib/discord-events'
import { prisma } from '@/lib/prisma'

type DiscordField = {
  name: string
  value: string
  inline?: boolean
}

type DiscordEmbed = {
  title: string
  description?: string
  color?: number
  fields?: DiscordField[]
}

function ownerWebhookUrl() {
  return process.env.DISCORD_OWNER_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL ?? null
}

function buildDiscordBody(embed: DiscordEmbed) {
  return {
    username: 'FlySky Ops',
    embeds: [
      {
        title: embed.title,
        description: embed.description,
        color: embed.color ?? 0x0ea5e9,
        fields: embed.fields,
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

async function postDiscordWebhook(webhookUrl: string, embed: DiscordEmbed) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildDiscordBody(embed)),
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw new Error(`Discord webhook failed (${response.status}): ${bodyText.slice(0, 250)}`)
  }

  return response.status
}

async function sendOwnerEmbed(embed: DiscordEmbed) {
  const webhookUrl = ownerWebhookUrl()
  if (!webhookUrl) return

  try {
    await postDiscordWebhook(webhookUrl, embed)
  } catch (err) {
    console.error('Owner Discord notification failed:', err)
  }
}

export async function sendAirlineEventEmbed(eventType: Phase2DiscordEventKey, airlineId: string, embed: DiscordEmbed) {
  const endpoints = await prisma.discordEndpoint.findMany({
    where: {
      scope: 'AIRLINE',
      airlineId,
      enabled: true,
      subscriptions: {
        some: {
          eventType: eventType as any,
          enabled: true,
        },
      },
    },
    include: {
      subscriptions: {
        where: { eventType: eventType as any },
        take: 1,
      },
    },
  })

  for (const endpoint of endpoints) {
    const subscription = endpoint.subscriptions[0]
    try {
      const httpStatus = await postDiscordWebhook(endpoint.webhookUrl, embed)

      await prisma.discordDeliveryLog.create({
        data: {
          endpointId: endpoint.id,
          subscriptionId: subscription?.id,
          eventType: eventType as any,
          scope: 'AIRLINE',
          airlineId,
          status: 'DELIVERED',
          httpStatus,
          deliveredAt: new Date(),
          payload: buildDiscordBody(embed),
        },
      })

      await prisma.discordEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastSuccessAt: new Date(),
          lastError: null,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Discord webhook error'

      await prisma.discordDeliveryLog.create({
        data: {
          endpointId: endpoint.id,
          subscriptionId: subscription?.id,
          eventType: eventType as any,
          scope: 'AIRLINE',
          airlineId,
          status: 'FAILED',
          error: message,
          payload: buildDiscordBody(embed),
        },
      })

      await prisma.discordEndpoint.update({
        where: { id: endpoint.id },
        data: { lastError: message },
      })

      console.error(`Airline Discord notification failed for endpoint ${endpoint.id}:`, error)
    }
  }
}

export async function sendAirlineDiscordTestWebhook(webhookUrl: string) {
  await postDiscordWebhook(webhookUrl, {
    title: 'FlySky Discord Integration Test',
    description: 'Your airline webhook is connected and ready.',
    color: 0x22c55e,
    fields: [{ name: 'Status', value: 'Connected', inline: true }],
  })
}

export async function notifyPilotSignup(input: {
  callsign: string
  firstName: string
  lastName: string
  email: string
  hub: string
}) {
  await sendOwnerEmbed({
    title: 'New Pilot Signup',
    color: 0x10b981,
    fields: [
      { name: 'Pilot', value: `${input.firstName} ${input.lastName} (${input.callsign})`, inline: true },
      { name: 'Email', value: input.email, inline: true },
      { name: 'Hub', value: input.hub, inline: true },
    ],
  })
}

export async function notifyAirlinePilotJoined(input: {
  airlineId: string
  airlineName: string
  callsign: string
  firstName: string
  lastName: string
}) {
  const embed: DiscordEmbed = {
    title: 'New Pilot Joined Airline',
    color: 0x22c55e,
    fields: [
      { name: 'Airline', value: input.airlineName, inline: true },
      { name: 'Pilot', value: `${input.firstName} ${input.lastName}`, inline: true },
      { name: 'Callsign', value: input.callsign, inline: true },
    ],
  }

  await sendAirlineEventEmbed('PILOT_SIGNUP', input.airlineId, embed)
}

export async function notifyAirlineApplicationSubmitted(input: {
  applicationId: string
  airlineName: string
  callsignPrefix: string
  contactName: string
  contactEmail: string
  hub: string
}) {
  await sendOwnerEmbed({
    title: 'New Airline Application',
    color: 0xf59e0b,
    fields: [
      { name: 'Airline', value: input.airlineName, inline: true },
      { name: 'Prefix', value: input.callsignPrefix, inline: true },
      { name: 'Hub', value: input.hub, inline: true },
      { name: 'Contact', value: input.contactName, inline: true },
      { name: 'Email', value: input.contactEmail, inline: true },
      { name: 'Application ID', value: input.applicationId, inline: false },
    ],
  })
}

export async function notifyPirepAccepted(input: {
  pirepId: string
  callsign: string
  pilotName: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  score: number
  airlineId?: string | null
}) {
  const embed: DiscordEmbed = {
    title: 'PIREP Accepted',
    color: 0x0ea5e9,
    fields: [
      { name: 'Pilot', value: `${input.pilotName} (${input.callsign})`, inline: true },
      { name: 'Flight', value: input.flightNumber, inline: true },
      { name: 'Route', value: `${input.depIcao} -> ${input.arrIcao}`, inline: true },
      { name: 'Score', value: String(input.score), inline: true },
      { name: 'PIREP ID', value: input.pirepId, inline: false },
    ],
  }

  await sendOwnerEmbed(embed)
  if (input.airlineId) {
    await sendAirlineEventEmbed('PIREP_ACCEPTED', input.airlineId, embed)
  }
}

export async function notifySupportReportSubmitted(input: {
  reportId: string
  category: string
  subject: string
  email?: string | null
  airlineName?: string | null
  airlineId?: string | null
}) {
  const embed: DiscordEmbed = {
    title: 'New Support Report',
    color: 0xef4444,
    fields: [
      { name: 'Category', value: input.category, inline: true },
      { name: 'Subject', value: input.subject, inline: true },
      { name: 'From', value: input.email ?? 'Unknown', inline: true },
      { name: 'Airline', value: input.airlineName ?? 'N/A', inline: true },
      { name: 'Report ID', value: input.reportId, inline: false },
    ],
  }

  await sendOwnerEmbed(embed)
  if (input.airlineId) {
    await sendAirlineEventEmbed('SUPPORT_REPORT_SUBMITTED', input.airlineId, embed)
  }
}

export async function notifyAirlineFlightPlanFiled(input: {
  airlineId: string
  callsign: string
  depIcao: string
  arrIcao: string
  aircraftType?: string | null
}) {
  await sendAirlineEventEmbed('FLIGHT_PLAN_FILED', input.airlineId, {
    title: 'Flight Plan Filed',
    color: 0x3b82f6,
    fields: [
      { name: 'Callsign', value: input.callsign, inline: true },
      { name: 'Route', value: `${input.depIcao} -> ${input.arrIcao}`, inline: true },
      { name: 'Aircraft', value: input.aircraftType ?? 'N/A', inline: true },
    ],
  })
}

export async function notifyAirlineRadarStarted(input: {
  airlineId: string
  pilotCallsign: string
  callsign: string
  depIcao: string
  arrIcao: string
}) {
  await sendAirlineEventEmbed('RADAR_STARTED', input.airlineId, {
    title: 'Radar Session Started',
    color: 0x22c55e,
    fields: [
      { name: 'Pilot', value: input.pilotCallsign, inline: true },
      { name: 'Callsign', value: input.callsign, inline: true },
      { name: 'Route', value: `${input.depIcao} -> ${input.arrIcao}`, inline: true },
    ],
  })
}

export async function notifyAirlineRadarEnded(input: {
  airlineId: string
  pilotCallsign: string
  callsign: string
  depIcao: string
  arrIcao: string
  status: 'ENDED' | 'ABORTED'
}) {
  await sendAirlineEventEmbed('RADAR_ENDED', input.airlineId, {
    title: 'Radar Session Ended',
    color: input.status === 'ENDED' ? 0xf59e0b : 0xef4444,
    fields: [
      { name: 'Pilot', value: input.pilotCallsign, inline: true },
      { name: 'Callsign', value: input.callsign, inline: true },
      { name: 'Route', value: `${input.depIcao} -> ${input.arrIcao}`, inline: true },
      { name: 'Status', value: input.status, inline: true },
    ],
  })
}

export async function notifyAirlineEventPublished(input: {
  airlineId: string
  title: string
  startDate: Date
  depIcao?: string | null
  arrIcao?: string | null
}) {
  await sendAirlineEventEmbed('EVENT_PUBLISHED', input.airlineId, {
    title: 'New Airline Event Published',
    color: 0x8b5cf6,
    fields: [
      { name: 'Event', value: input.title, inline: false },
      { name: 'Starts', value: input.startDate.toISOString(), inline: true },
      { name: 'Route', value: input.depIcao || input.arrIcao ? `${input.depIcao ?? '---'} -> ${input.arrIcao ?? '---'}` : 'N/A', inline: true },
    ],
  })
}

export async function notifyAirlineNotamPublished(input: {
  airlineId: string
  title: string
  severity: string
}) {
  await sendAirlineEventEmbed('NOTAM_PUBLISHED', input.airlineId, {
    title: 'New Airline NOTAM',
    color: 0xf97316,
    fields: [
      { name: 'Title', value: input.title, inline: false },
      { name: 'Severity', value: input.severity, inline: true },
    ],
  })
}
