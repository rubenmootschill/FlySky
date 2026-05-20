import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  await requireAdmin()
  const pireps = await prisma.pirep.findMany({
    orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
    include: {
      pilot: { select: { callsign: true, firstName: true, lastName: true } },
    },
  })
  return NextResponse.json(pireps)
}
