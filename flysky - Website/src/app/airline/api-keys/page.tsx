import { redirect } from 'next/navigation'

import AirlineApiKeysCard from '@/components/airline/airline-api-keys-card'
import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import type { AirlineApiScopeKey } from '@/lib/airline-api-scopes'
import { prisma } from '@/lib/prisma'

export default async function AirlineApiKeysPage() {
  const session = await requireAuth()
  const selectedAirlineId = await resolveActiveAirlineId(session.user)

  if (!selectedAirlineId) {
    redirect('/dashboard')
  }

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
    select: {
      id: true,
      name: true,
      callsignPrefix: true,
      hub: true,
    },
  })

  if (!airline) {
    redirect('/dashboard')
  }

  const apiKeys = await prisma.airlineApiKey.findMany({
    where: {
      airlineId: airline.id,
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="section-title">Airline API Keys</h1>
        <p className="section-subtitle mt-1">{airline.name} · {airline.callsignPrefix} · Hub: {airline.hub}</p>
      </div>

      <AirlineApiKeysCard
        initialKeys={apiKeys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes.map((scope) => scope.toLowerCase() as AirlineApiScopeKey),
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        }))}
      />
    </div>
  )
}
