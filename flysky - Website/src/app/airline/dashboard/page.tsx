import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Plane, Users, Route, Activity } from 'lucide-react'
import Link from 'next/link'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import AirlineDashboardStats from '@/components/airline/airline-dashboard-stats'

export default async function AirlineDashboard() {
  const session = await requireAuth()
  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) redirect('/dashboard')

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
    include: { _count: { select: { routes: { where: { active: true } } } } },
  })
  if (!airline) redirect('/dashboard')

  const [totalPireps, pendingPireps] = await Promise.all([
    prisma.pirep.count({ where: { status: 'ACCEPTED', route_ref: { airlineId: airline.id } } }),
    prisma.pirep.count({ where: { status: 'PENDING', route_ref: { airlineId: airline.id } } }),
  ])

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

  const [flightsLast30Days, recentFlights] = await Promise.all([
    prisma.pirep.findMany({
      where: {
        route_ref: { airlineId: airline.id },
        submittedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { submittedAt: 'asc' },
      include: {
        pilot: { select: { callsign: true } },
        aircraft: { select: { registration: true, icaoCode: true } },
      },
    }),
    prisma.pirep.findMany({
      where: {
        route_ref: { airlineId: airline.id },
        submittedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        pilot: { select: { callsign: true } },
        aircraft: { select: { registration: true, icaoCode: true } },
      },
    }),
  ])

  const mappedFlightsLast30Days = flightsLast30Days.map((f) => ({
    id: f.id,
    flightNumber: f.flightNumber,
    pilotCallsign: f.pilot?.callsign ?? 'N/A',
    depIcao: f.depIcao,
    arrIcao: f.arrIcao,
    network: f.network || 'OFFLINE',
    depUtc: new Date(f.depTime).toISOString().slice(11, 16),
    durationMin: f.flightTime,
    aircraft: f.aircraft?.registration || f.aircraft?.icaoCode || 'N/A',
    pax: f.passengerCount,
    cargoKg: f.cargoWeight,
    score: f.score,
    landingRate: f.landingRate,
    status: f.status,
    submittedAt: new Date(f.submittedAt).toISOString(),
    fuelUsedKg: f.fuelUsed ?? 0,
  }))

  const mappedRecentFlights = recentFlights.map((f) => ({
    id: f.id,
    flightNumber: f.flightNumber,
    pilotCallsign: f.pilot?.callsign ?? 'N/A',
    depIcao: f.depIcao,
    arrIcao: f.arrIcao,
    network: f.network || 'OFFLINE',
    depUtc: new Date(f.depTime).toISOString().slice(11, 16),
    durationMin: f.flightTime,
    aircraft: f.aircraft?.registration || f.aircraft?.icaoCode || 'N/A',
    pax: f.passengerCount,
    cargoKg: f.cargoWeight,
    score: f.score,
    landingRate: f.landingRate,
    status: f.status,
    submittedAt: new Date(f.submittedAt).toISOString(),
    fuelUsedKg: f.fuelUsed ?? 0,
  }))

  const liveFlights = 0 // live tracking not airline-scoped yet

  const stats = [
    { label: 'Active Routes', value: airline._count.routes, icon: Route, color: 'text-sky-400' },
    { label: 'Total Flights', value: totalPireps, icon: Plane, color: 'text-emerald-400' },
    { label: 'Pending PIREPs', value: pendingPireps, icon: Activity, color: 'text-amber-400' },
    { label: 'Live Now', value: liveFlights, icon: Users, color: 'text-indigo-400' },
  ]

  return (
    <div className="space-y-6 w-full max-w-none">
      <div>
        <h1 className="section-title">{airline.name}</h1>
        <p className="section-subtitle mt-1">Airline Operations Dashboard · {airline.callsignPrefix} · Hub: {airline.hub}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <AirlineDashboardStats
        flightsLast30Days={mappedFlightsLast30Days}
        recentFlights={mappedRecentFlights}
      />
    </div>
  )
}
