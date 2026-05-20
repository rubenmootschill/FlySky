import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { notifyAirlineFlightPlanFiled } from '@/lib/discord-notify'
import { prisma } from '@/lib/prisma'

const API_KEY = process.env.SIMBRIEF_API_KEY || ''

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'SimBrief API key not configured' },
        { status: 500 }
      )
    }

    const { orig, dest, type, outputpage } = await req.json()

    if (!orig || !dest || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters: orig, dest, type' },
        { status: 400 }
      )
    }

    // Generate timestamp (seconds since epoch)
    const timestamp = Math.floor(Date.now() / 1000)

    // Normalize parameters for hashing
    const origUpper = orig.toUpperCase().trim()
    const destUpper = dest.toUpperCase().trim()
    const typeUpper = type.toUpperCase().trim()
    // Normalize outputpage - remove protocol
    const outputpageNorm = (outputpage || '')
      .replace('https://', '')
      .replace('http://', '')
      .trim()

    // Generate SimBrief API hash: MD5(API_KEY + orig + dest + type + timestamp + outputpage)
    const hashInput = `${API_KEY}${origUpper}${destUpper}${typeUpper}${timestamp}${outputpageNorm}`
    const apiCode = crypto.createHash('md5').update(hashInput).digest('hex')

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user?.id) {
      const pilot = await prisma.pilot.findUnique({
        where: { userId: session.user.id },
        select: {
          callsign: true,
          airlineId: true,
        },
      })

      if (pilot?.airlineId) {
        await notifyAirlineFlightPlanFiled({
          airlineId: pilot.airlineId,
          callsign: pilot.callsign,
          depIcao: origUpper,
          arrIcao: destUpper,
          aircraftType: typeUpper,
        })
      }
    }

    // Return the auth credentials for frontend form submission
    return NextResponse.json({
      apiCode,
      timestamp,
      orig: origUpper,
      dest: destUpper,
      type: typeUpper,
      outputpage: outputpageNorm,
    })
  } catch (error) {
    console.error('SimBrief form generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate SimBrief form' },
      { status: 500 }
    )
  }
}
