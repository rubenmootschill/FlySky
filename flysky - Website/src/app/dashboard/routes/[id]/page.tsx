'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, PlaneTakeoff, PlaneLanding, Timer, Ruler, Building2, Send } from 'lucide-react'

type RouteDetails = {
  id: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  depName: string
  arrName: string
  distance: number
  flightTime: number
  aircraftType: string | null
  active: boolean
  airline: {
    name: string
    callsignPrefix: string | null
  } | null
}

function formatFlightTime(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'N/A'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export default function RouteDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const routeId = (params?.id ?? '').trim()

  const { data: route, isLoading, isError } = useQuery<RouteDetails>({
    queryKey: ['route-details', routeId],
    queryFn: async () => {
      const response = await fetch(`/api/routes/${routeId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load route')
      }
      return data
    },
    enabled: Boolean(routeId),
  })

  const scheduleRow = useMemo(() => {
    if (!route) return null
    return {
      cs: route.airline?.callsignPrefix?.toUpperCase() || 'N/A',
      fn: route.flightNumber,
      operator: route.airline?.name || 'Virtual Airline',
      fleet: route.aircraftType || 'Assigned by fleet manager',
      ete: formatFlightTime(route.flightTime),
      dst: `${route.distance.toLocaleString()} NM`,
      status: route.active ? 'Active' : 'Inactive',
    }
  }, [route])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="section-title">Dispatch Route</h1>
          <p className="section-subtitle mt-1">Scheduled flight details from the route you selected in booking.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/book')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Book
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">Loading route details...</div>
      ) : isError || !route || !scheduleRow ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
          Unable to load this route.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><PlaneTakeoff className="h-3.5 w-3.5" /> Departure</div>
              <div className="mt-1 text-xl font-black text-slate-900">{route.depIcao}</div>
              <div className="text-xs text-slate-500">{route.depName}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><PlaneLanding className="h-3.5 w-3.5" /> Arrival</div>
              <div className="mt-1 text-xl font-black text-slate-900">{route.arrIcao}</div>
              <div className="text-xs text-slate-500">{route.arrName}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Timer className="h-3.5 w-3.5" /> ETE</div>
              <div className="mt-1 text-xl font-black text-slate-900">{scheduleRow.ete}</div>
              <div className="text-xs text-slate-500">Estimated flight time</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-500"><Ruler className="h-3.5 w-3.5" /> Distance</div>
              <div className="mt-1 text-xl font-black text-slate-900">{scheduleRow.dst}</div>
              <div className="text-xs text-slate-500">Great-circle NM</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Scheduled Flight</div>
              <div className="text-xs text-slate-500">From chosen flight in booking map</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#102761] text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">CS</th>
                    <th className="px-4 py-2 text-left font-semibold">FN</th>
                    <th className="px-4 py-2 text-left font-semibold">Operator</th>
                    <th className="px-4 py-2 text-left font-semibold">Fleets</th>
                    <th className="px-4 py-2 text-left font-semibold">ETE</th>
                    <th className="px-4 py-2 text-left font-semibold">DST</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-center font-semibold">Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{scheduleRow.cs}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{scheduleRow.fn}</td>
                    <td className="px-4 py-3 text-slate-700">{scheduleRow.operator}</td>
                    <td className="px-4 py-3 text-slate-700">{scheduleRow.fleet}</td>
                    <td className="px-4 py-3 text-slate-700">{scheduleRow.ete}</td>
                    <td className="px-4 py-3 text-slate-700">{scheduleRow.dst}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${route.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {scheduleRow.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/dispatch/${route.id}`)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#2d66e5] transition hover:bg-sky-50"
                        title="Open Dispatch"
                        aria-label="Open Dispatch"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Building2 className="h-4 w-4" /> Route ID</div>
            <div className="mt-1 font-mono text-sm text-slate-600">{route.id}</div>
          </div>
        </>
      )}
    </div>
  )
}
