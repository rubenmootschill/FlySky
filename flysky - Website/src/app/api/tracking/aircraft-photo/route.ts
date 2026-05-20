import { NextRequest, NextResponse } from 'next/server'

const PLANESPOTTERS_BASE_URL = 'https://www.planespotters.net/photo/api'

function collectImageUrls(value: unknown, found: Set<string>) {
  if (!value) return

  if (typeof value === 'string') {
    const lowered = value.toLowerCase()
    const isUrl = lowered.startsWith('http://') || lowered.startsWith('https://')
    const looksLikeImage = /(jpg|jpeg|png|webp)(\?|$)/i.test(value)
    if (isUrl && looksLikeImage) {
      found.add(value)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, found))
    return
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectImageUrls(item, found))
  }
}

async function fetchFromPlaneSpotters(query: string) {
  const variants = [
    `${PLANESPOTTERS_BASE_URL}?q=${encodeURIComponent(query)}`,
    `${PLANESPOTTERS_BASE_URL}?search=${encodeURIComponent(query)}`,
    `${PLANESPOTTERS_BASE_URL}?keyword=${encodeURIComponent(query)}`,
  ]

  for (const url of variants) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      })

      if (!response.ok) continue

      const json = await response.json()
      const images = new Set<string>()
      collectImageUrls(json, images)

      if (images.size > 0) {
        return Array.from(images)[0]
      }
    } catch {
      // Continue to the next query variant.
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const callsign = req.nextUrl.searchParams.get('callsign')?.trim() ?? ''
  const depIcao = req.nextUrl.searchParams.get('depIcao')?.trim() ?? ''
  const arrIcao = req.nextUrl.searchParams.get('arrIcao')?.trim() ?? ''

  const searchQueries = [callsign, `${callsign} ${depIcao} ${arrIcao}`.trim(), depIcao, arrIcao].filter(
    (value, index, all) => value.length > 0 && all.indexOf(value) === index,
  )

  for (const query of searchQueries) {
    const photoUrl = await fetchFromPlaneSpotters(query)
    if (photoUrl) {
      return NextResponse.json({ photoUrl, provider: 'planespotters', query })
    }
  }

  return NextResponse.json({ photoUrl: null, provider: 'planespotters' })
}
