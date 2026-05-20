import { NextResponse } from 'next/server'

type AviationWeatherMetar = {
  icaoId?: string
  rawOb?: string
  obsTime?: number
  wdir?: number | string
  wspd?: number | string
  wg?: number | string
  visib?: number | string
  altim?: number | string
  temp?: number | string
  dewp?: number | string
  clouds?: Array<{ cover?: string; base?: number | string }>
}

const parseNumber = (value: unknown): number | null => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const toIso = (obsTime?: number) => {
  if (!obsTime) return null
  const ms = obsTime > 10_000_000_000 ? obsTime : obsTime * 1000
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function fetchFromAviationWeather(icao: string) {
  const url = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null

  const payload = await response.json()
  const row: AviationWeatherMetar | undefined = Array.isArray(payload) ? payload[0] : undefined
  if (!row) return null

  const clouds = Array.isArray(row.clouds)
    ? row.clouds
        .map((cloud) => {
          if (!cloud?.cover) return null
          const base = parseNumber(cloud.base)
          return base !== null ? `${cloud.cover} ${base} ft` : `${cloud.cover}`
        })
        .filter(Boolean)
    : []

  return {
    icao,
    raw: row.rawOb ?? null,
    observedAt: toIso(row.obsTime),
    windDir: parseNumber(row.wdir),
    windSpeedKt: parseNumber(row.wspd),
    windGustKt: parseNumber(row.wg),
    visibilitySm: parseNumber(row.visib),
    altimeterInHg: parseNumber(row.altim),
    tempC: parseNumber(row.temp),
    dewpointC: parseNumber(row.dewp),
    cloudLayers: clouds,
    source: 'aviationweather.gov',
  }
}

async function fetchFromNoaaText(icao: string) {
  const url = `https://tgftp.nws.noaa.gov/data/observations/metar/stations/${icao}.TXT`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return null

  const text = (await response.text()).trim()
  if (!text) return null
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length === 0) return null

  return {
    icao,
    raw: lines[lines.length - 1] ?? null,
    observedAt: lines[0] && !Number.isNaN(Date.parse(lines[0])) ? new Date(lines[0]).toISOString() : null,
    windDir: null,
    windSpeedKt: null,
    windGustKt: null,
    visibilitySm: null,
    altimeterInHg: null,
    tempC: null,
    dewpointC: null,
    cloudLayers: [],
    source: 'tgftp.nws.noaa.gov',
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const icao = (searchParams.get('icao') ?? '').trim().toUpperCase()

  if (!/^[A-Z]{4}$/.test(icao)) {
    return NextResponse.json({ error: 'A valid 4-letter ICAO is required' }, { status: 400 })
  }

  try {
    const primary = await fetchFromAviationWeather(icao)
    if (primary) return NextResponse.json(primary, { headers: { 'Cache-Control': 'no-store' } })

    const fallback = await fetchFromNoaaText(icao)
    if (fallback) return NextResponse.json(fallback, { headers: { 'Cache-Control': 'no-store' } })

    return NextResponse.json({ error: `No METAR found for ${icao}` }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch METAR data' }, { status: 500 })
  }
}
