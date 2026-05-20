import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'SimBrief username required' }, { status: 400 })

  try {
    const res = await fetch(
      `${process.env.SIMBRIEF_API_URL}?username=${encodeURIComponent(username)}&json=1`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'SimBrief API error' }, { status: 502 })
    const data = await res.json()

    // Save SimBrief username to pilot profile
    const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })
    if (pilot && !pilot.simBriefUser) {
      await prisma.pilot.update({ where: { id: pilot.id }, data: { simBriefUser: username } })
    }

    // Extract useful OFP fields
    const ofp = {
      origin: data.origin?.icao_code,
      destination: data.destination?.icao_code,
      callsign: data.atc?.callsign,
      aircraft: data.aircraft?.icaocode,
      route: data.general?.route,
      flightTime: data.times?.est_time_enroute,
      fuelOnBoard: data.fuel?.plan_ramp,
      paxCount: data.weights?.pax_count,
      cruiseAlt: data.general?.initial_altitude,
      ete: data.times?.est_time_enroute,
      ofpId: data.params?.request_id,
    }

    return NextResponse.json(ofp)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch SimBrief OFP' }, { status: 502 })
  }
}
