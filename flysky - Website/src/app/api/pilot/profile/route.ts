import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pilot = await prisma.pilot.findFirst({
      where: {
        user: { email: session.user.email },
      },
      select: {
        id: true,
        airlineId: true,
        callsign: true,
        firstName: true,
        lastName: true,
        memberships: {
          select: {
            airlineId: true,
            joinedAt: true,
            airline: { select: { id: true, name: true, callsignPrefix: true, logoUrl: true } },
          },
        },
      },
    })

    if (!pilot) {
      return NextResponse.json({ error: 'Pilot not found' }, { status: 404 })
    }

    return NextResponse.json(pilot)
  } catch (error) {
    console.error('Failed to fetch pilot profile:', error)
    return NextResponse.json({ error: 'Failed to fetch pilot profile' }, { status: 500 })
  }
}
