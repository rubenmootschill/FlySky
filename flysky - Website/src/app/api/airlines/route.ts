import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  const airlines = await prisma.airline.findMany({
    where: { 
      status: 'ACTIVE',
      ...(id && { id }),
    },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { routes: { where: { active: true } }, memberships: true } },
    },
  })
  return NextResponse.json(airlines)
}
