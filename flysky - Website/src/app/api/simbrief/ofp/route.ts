import { NextResponse } from 'next/server'

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text.length > 0) return text
  }
  return ''
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const numeric = Number(String(value).replace(/,/g, '').trim())
    if (Number.isFinite(numeric)) return numeric
  }
  return null
}

function normalizeFlightLevel(rawAltitude: unknown): string {
  const raw = pickString(rawAltitude)
  if (!raw) return ''

  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return raw.toUpperCase().startsWith('FL') ? raw.toUpperCase() : raw

  const altitude = Number(digits)
  if (!Number.isFinite(altitude) || altitude <= 0) return ''

  // SimBrief may return 390 (FL390) or 39000 (feet).
  const level = altitude >= 1000 ? Math.round(altitude / 100) : altitude
  return `FL${level}`
}

export async function POST(req: Request) {
  try {
    const { username } = await req.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Navigraph username is required' },
        { status: 400 }
      )
    }

    // Fetch OFP data from SimBrief API
    const response = await fetch(
      `https://www.simbrief.com/api/xml.fetcher.php?username=${encodeURIComponent(username)}&json=v2`,
      { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch OFP data from SimBrief' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract relevant flight plan data
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      )
    }

    const general = data.general ?? {}
    const atc = data.atc ?? {}
    const params = data.params ?? {}
    const weights = data.weights ?? {}
    const times = data.times ?? {}

    // Parse OFP data and extract flight planning information
    const ofpData = {
      // Route info
      route: pickString(general.route, params.route),
      costIndex: pickString(general.costindex, params.civalue),
      flightLevel: normalizeFlightLevel(general.initial_altitude || params.initial_altitude || params.fl),
      callsign: pickString(atc.callsign, general.callsign, params.callsign),
      altAirport: pickString(general.alternate?.code, general.altn_icao),
      
      // Flight details
      flightNumber: pickString(
        general.flight_number,
        general.flightnumber,
        general.fltnum,
        params.fltnum,
      ),
      departureTime: pickString(
        times.est_out,
        times.sched_out,
        general.dep_time,
        general.departure_time,
        `${pickString(params.deph)}${pickString(params.depm)}`,
      ),
      arrivalTime: pickString(
        times.est_in,
        times.sched_in,
        general.arr_time,
        general.arrival_time,
      ),
      
      // Payload data
      passengers: pickString(
        weights.pax_count,
        general.pax_count,
        params.pax,
      ),
      cargo: pickString(
        weights.cargo,
        weights.cargo_weight,
        general.cargo,
        general.cargo_weight,
        params.cargo,
      ),
      payloadKg: pickNumber(
        weights.payload,
        weights.payload_kg,
        weights.est_payload,
        general.payload,
      ),
      
      // Additional data that could be useful
      fuel: Number(general.avg_fuel_generated_kg || weights.block_fuel || 0),
      distance: Number(general.distance || 0),
      time: pickString(general.avg_time_generated, times.air_time),
    }

    return NextResponse.json(ofpData)
  } catch (error) {
    console.error('Error fetching OFP:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OFP data' },
      { status: 500 }
    )
  }
}
