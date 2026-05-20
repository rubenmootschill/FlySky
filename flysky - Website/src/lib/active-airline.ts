import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

type SessionUser = {
  role?: string | null
  email?: string | null
}

export async function listAccessibleAirlines(user: SessionUser) {
  if (user.role === 'ADMIN') {
    return prisma.airline.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, callsignPrefix: true, hub: true },
    })
  }

  if (!user.email) return []

  return prisma.airline.findMany({
    where: { ownerEmail: user.email },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, callsignPrefix: true, hub: true },
  })
}

export async function resolveActiveAirlineId(user: SessionUser) {
  const airlines = await listAccessibleAirlines(user)
  if (airlines.length === 0) return null

  const selectedId = (await cookies()).get('activeAirlineId')?.value
  if (selectedId && airlines.some((airline) => airline.id === selectedId)) {
    return selectedId
  }

  return airlines[0].id
}
