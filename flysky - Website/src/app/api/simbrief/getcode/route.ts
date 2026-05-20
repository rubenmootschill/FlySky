import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const API_KEY = process.env.SIMBRIEF_API_KEY || ''

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'SimBrief API key not configured' },
        { status: 500 }
      )
    }

    const { orig, dest, type, outputpage } = await req.json()

    if (!orig || !dest || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: orig, dest, type' },
        { status: 400 }
      )
    }

    // Create the hash for SimBrief API (format: MD5(API_KEY + orig + dest + type + timestamp + outputpage))
    // Note: Use uppercase ICAO codes and strip protocol from outputpage
    const timestamp = Math.floor(Date.now() / 1000)
    const origUpper = orig.toUpperCase()
    const destUpper = dest.toUpperCase()
    const typeUpper = type.toUpperCase()
    const outputpageNormalized = (outputpage || '')
      .replace('https://', '')
      .replace('http://', '')
    
    const hashInput = `${API_KEY}${origUpper}${destUpper}${typeUpper}${timestamp}${outputpageNormalized}`
    const apiCode = crypto.createHash('md5').update(hashInput).digest('hex')

    return NextResponse.json({ apiCode, timestamp })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate SimBrief API code' },
      { status: 500 }
    )
  }
}
