interface ScoringInput {
  landingRate?: number
  flightTime: number
}

interface ScoringResult {
  score: number
  breakdown: Record<string, number>
}

export function scorePirep({ landingRate, flightTime }: ScoringInput): ScoringResult {
  const breakdown: Record<string, number> = {}

  // Base score for completing a flight
  breakdown.base = 100

  // Flight time bonus (1 point per 10 minutes, max 50)
  breakdown.flightTime = Math.min(50, Math.floor(flightTime / 10))

  // Landing rate scoring (only if provided)
  if (landingRate !== undefined) {
    const rate = Math.abs(landingRate)
    if (rate <= 100) breakdown.landing = 50
    else if (rate <= 200) breakdown.landing = 40
    else if (rate <= 300) breakdown.landing = 25
    else if (rate <= 500) breakdown.landing = 10
    else if (rate <= 800) breakdown.landing = 0
    else breakdown.landing = -25 // crash-like landing
  }

  const score = Math.max(0, Object.values(breakdown).reduce((a, b) => a + b, 0))
  return { score, breakdown }
}
