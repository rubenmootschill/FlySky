'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useMemo } from 'react'

type FlightRow = {
  id: string
  flightNumber: string
  pilotCallsign: string
  depIcao: string
  arrIcao: string
  network: string
  depUtc: string
  durationMin: number
  aircraft: string
  pax: number
  cargoKg: number
  score: number
  landingRate: number | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  submittedAt: string
  fuelUsedKg: number
}

type Props = {
  flightsLast30Days: FlightRow[]
  recentFlights: FlightRow[]
}

type DailyBucket = {
  key: string
  day: string
  accepted: number
  pending: number
  rejected: number
  avgLanding: number | null
  minLanding: number | null
  maxLanding: number | null
  pax: number
  cargoTons: number
  fuelTons: number
}

const CHART_TEXT = '#94a3b8'
const CHART_GRID = '#1f2937'
const TOOLTIP_BG = '#020617'
const TOOLTIP_BORDER = '#334155'
const PIE_COLORS = ['#38bdf8', '#f59e0b', '#a78bfa']

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toDayLabel(date: Date) {
  return date.getDate().toString()
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

export default function AirlineDashboardStats({ flightsLast30Days, recentFlights }: Props) {
  const daily = useMemo<DailyBucket[]>(() => {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 29)

    const map = new Map<string, DailyBucket>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = dayKey(d)
      map.set(key, {
        key,
        day: toDayLabel(d),
        accepted: 0,
        pending: 0,
        rejected: 0,
        avgLanding: null,
        minLanding: null,
        maxLanding: null,
        pax: 0,
        cargoTons: 0,
        fuelTons: 0,
      })
    }

    const landingMap = new Map<string, number[]>()

    for (const f of flightsLast30Days) {
      const key = f.submittedAt.slice(0, 10)
      const row = map.get(key)
      if (!row) continue

      if (f.status === 'ACCEPTED') row.accepted += 1
      if (f.status === 'PENDING') row.pending += 1
      if (f.status === 'REJECTED') row.rejected += 1

      row.pax += f.pax
      row.cargoTons += f.cargoKg / 1000
      row.fuelTons += f.fuelUsedKg / 1000

      if (typeof f.landingRate === 'number') {
        const absRate = Math.abs(f.landingRate)
        const arr = landingMap.get(key) ?? []
        arr.push(absRate)
        landingMap.set(key, arr)
      }
    }

    for (const [key, rates] of landingMap.entries()) {
      const row = map.get(key)
      if (!row || rates.length === 0) continue
      const sum = rates.reduce((a, b) => a + b, 0)
      row.avgLanding = Math.round(sum / rates.length)
      row.minLanding = Math.round(Math.min(...rates))
      row.maxLanding = Math.round(Math.max(...rates))
    }

    return Array.from(map.values())
  }, [flightsLast30Days])

  const pieData = useMemo(() => {
    const accepted = flightsLast30Days.filter((f) => f.status === 'ACCEPTED').length
    const pending = flightsLast30Days.filter((f) => f.status === 'PENDING').length
    const rejected = flightsLast30Days.filter((f) => f.status === 'REJECTED').length
    return [
      { name: 'Accepted', value: accepted },
      { name: 'Pending', value: pending },
      { name: 'Rejected', value: rejected },
    ]
  }, [flightsLast30Days])

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold text-slate-900">Dashboard Stats</h2>
        <p className="text-xs text-slate-500 mt-1">Last 30 days performance overview</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {/* Landing Performance Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Landing Performance (fpm)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} horizontal={true} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: `1px solid #e2e8f0`, borderRadius: 6 }}
                    labelStyle={{ color: '#1e293b' }}
                    formatter={(v: number, n: string) => [`${v ?? 'N/A'}${v ? ' fpm' : ''}`, n]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16, color: '#64748b' }} />
                  <Line type="monotone" dataKey="maxLanding" stroke="#2563eb" strokeWidth={2.5} dot={false} connectNulls name="Max" />
                  <Line type="monotone" dataKey="avgLanding" stroke="#16a34a" strokeWidth={2.5} dot={false} connectNulls name="Avg" />
                  <Line type="monotone" dataKey="minLanding" stroke="#ea580c" strokeWidth={2.5} dot={false} connectNulls name="Min" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIREP Status Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              PIREP Operations
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} horizontal={true} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: `1px solid #e2e8f0`, borderRadius: 6 }}
                    labelStyle={{ color: '#1e293b' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16, color: '#64748b' }} />
                  <Bar dataKey="accepted" stackId="ops" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Accepted" />
                  <Bar dataKey="pending" stackId="ops" fill="#22c55e" radius={[0, 0, 0, 0]} name="Pending" />
                  <Bar dataKey="rejected" stackId="ops" fill="#ef4444" radius={[0, 0, 0, 0]} name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cargo & Passengers Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Cargo & Passenger Load
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} horizontal={true} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: `1px solid #e2e8f0`, borderRadius: 6 }}
                    labelStyle={{ color: '#1e293b' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16, color: '#64748b' }} />
                  <Bar dataKey="pax" stackId="load" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Passengers" />
                  <Bar dataKey="cargoTons" stackId="load" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Cargo (tons)" />
                  <Bar dataKey="fuelTons" stackId="load" fill="#06b6d4" radius={[0, 0, 0, 0]} name="Fuel (tons)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Chart - Status Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            Status Breakdown
          </h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={85} label={{ fill: '#64748b', fontSize: 11 }}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ paddingTop: 12, color: '#64748b', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Flights Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Recent Flights
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-slate-700 border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-semibold">Flight #</th>
                <th className="text-left py-3 px-4 font-semibold">Pilot</th>
                <th className="text-left py-3 px-4 font-semibold">Dep</th>
                <th className="text-left py-3 px-4 font-semibold">Arr</th>
                <th className="text-left py-3 px-4 font-semibold">Network</th>
                <th className="text-left py-3 px-4 font-semibold">Dep UTC</th>
                <th className="text-left py-3 px-4 font-semibold">Duration</th>
                <th className="text-left py-3 px-4 font-semibold">Aircraft</th>
                <th className="text-left py-3 px-4 font-semibold">Pax</th>
                <th className="text-left py-3 px-4 font-semibold">Cargo</th>
                <th className="text-left py-3 px-4 font-semibold">Score</th>
                <th className="text-left py-3 px-4 font-semibold">Rating</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFlights.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">No flights in this period</td>
                </tr>
              ) : (
                recentFlights.map((f, idx) => (
                  <tr key={f.id} className={`border-b border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                    <td className="py-3 px-4 font-mono text-blue-600">{f.flightNumber}</td>
                    <td className="py-3 px-4">{f.pilotCallsign}</td>
                    <td className="py-3 px-4 font-semibold">{f.depIcao}</td>
                    <td className="py-3 px-4 font-semibold">{f.arrIcao}</td>
                    <td className="py-3 px-4">{f.network}</td>
                    <td className="py-3 px-4 text-xs">{f.depUtc}</td>
                    <td className="py-3 px-4">{formatDuration(f.durationMin)}</td>
                    <td className="py-3 px-4">{f.aircraft}</td>
                    <td className="py-3 px-4">{f.pax}</td>
                    <td className="py-3 px-4">{Math.round(f.cargoKg)} kg</td>
                    <td className="py-3 px-4 text-green-600 font-semibold">{f.score}</td>
                    <td className="py-3 px-4">{typeof f.landingRate === 'number' ? `${Math.round(Math.abs(f.landingRate))} fpm` : 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        f.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        f.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
