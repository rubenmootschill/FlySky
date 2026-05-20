'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Wind, Eye, Thermometer, Gauge, Cloud } from 'lucide-react'

type AirportInfo = {
  icao: string
  name: string
  lat: number
  lng: number
}

type MetarInfo = {
  icao: string
  raw: string | null
  observedAt: string | null
  windDir: number | null
  windSpeedKt: number | null
  windGustKt: number | null
  visibilitySm: number | null
  altimeterInHg: number | null
  tempC: number | null
  dewpointC: number | null
  cloudLayers: string[]
  source: string
}

export default function AirportInfoPage() {
  const params = useParams<{ icao: string }>()
  const router = useRouter()
  const icao = (params?.icao ?? '').trim().toUpperCase()

  const { data: airport, isLoading: airportLoading } = useQuery<AirportInfo | null>({
    queryKey: ['airport-info', icao],
    queryFn: async () => {
      const res = await fetch(`/api/tracking/airports?icao=${encodeURIComponent(icao)}`)
      const data = await res.json()
      return Array.isArray(data) && data.length > 0 ? data[0] : null
    },
    enabled: /^[A-Z]{4}$/.test(icao),
  })

  const { data: metar, isLoading: metarLoading, error: metarError } = useQuery<MetarInfo>({
    queryKey: ['airport-metar', icao],
    queryFn: async () => {
      const res = await fetch(`/api/weather/metar?icao=${encodeURIComponent(icao)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load METAR')
      }
      return data
    },
    enabled: /^[A-Z]{4}$/.test(icao),
    retry: 1,
  })

  const observedLabel = useMemo(() => {
    if (!metar?.observedAt) return 'N/A'
    const date = new Date(metar.observedAt)
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toUTCString()
  }, [metar?.observedAt])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div>
          <h1 className="section-title">Airport Info · {icao || '----'}</h1>
          <p className="section-subtitle mt-1">
            {airport?.name ?? 'Airport details'}
            {airport ? ` · ${airport.lat.toFixed(3)}, ${airport.lng.toFixed(3)}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/book')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Book
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">METAR</h2>
        </div>

        {metarLoading || airportLoading ? (
          <div className="text-sm text-slate-500">Loading airport weather...</div>
        ) : metarError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {(metarError as Error).message}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900">
              {metar?.raw ?? 'METAR not available'}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase text-slate-500">Observed</div>
                <div className="mt-1 text-slate-900">{observedLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Wind className="h-3.5 w-3.5" /> Wind</div>
                <div className="mt-1 text-slate-900">
                  {metar?.windDir ?? '--'}° / {metar?.windSpeedKt ?? '--'} kt
                  {metar?.windGustKt ? ` G${metar.windGustKt}` : ''}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Eye className="h-3.5 w-3.5" /> Visibility</div>
                <div className="mt-1 text-slate-900">{metar?.visibilitySm ?? '--'} SM</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Thermometer className="h-3.5 w-3.5" /> Temp / Dew</div>
                <div className="mt-1 text-slate-900">{metar?.tempC ?? '--'}C / {metar?.dewpointC ?? '--'}C</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Gauge className="h-3.5 w-3.5" /> Altimeter</div>
                <div className="mt-1 text-slate-900">{metar?.altimeterInHg ?? '--'} inHg</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Cloud className="h-3.5 w-3.5" /> Clouds</div>
                <div className="mt-1 text-slate-900">{metar?.cloudLayers?.length ? metar.cloudLayers.join(', ') : 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
