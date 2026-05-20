import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pilot = await prisma.pilot.findUnique({
    where: { userId: session.user.id },
    include: { rank: true, badges: { include: { badge: true } } },
  })
  return NextResponse.json(pilot)
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { simBriefUser, hub } = await req.json()
  const pilot = await prisma.pilot.update({
    where: { userId: session.user.id },
    data: { simBriefUser, hub },
  })
  return NextResponse.json(pilot)
}
