import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Plane, Clock, Star, TrendingUp, CheckCircle, AlertCircle, CalendarDays, Radio } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import DashboardOpsMap from '@/components/dashboard/dashboard-ops-map'

export default async function DashboardPage() {
  const session = await requireAuth()
  const latestBooking = await prisma.booking.findFirst({
    where: { pilot: { userId: session.user.id }, used: false },
    orderBy: { bookedAt: 'desc' },
    select: { id: true },
  })

  const pilot = await prisma.pilot.findUnique({
    where: { userId: session.user.id },
    include: {
      rank: true,
      badges: { include: { badge: true }, take: 5 },
      pireps: {
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: { route_ref: true },
      },
    },
  })

  if (!pilot) return <div className="text-slate-400">Pilot profile not found.</div>

  const pendingPireps = pilot.pireps.filter((p) => p.status === 'PENDING').length
  const acceptedPireps = pilot.pireps.filter((p) => p.status === 'ACCEPTED').length

  const activeAirlineId = pilot.airlineId
  let selectedAirlineEvents: Array<{
    id: string
    title: string
    imageUrl: string | null
    startDate: Date
    depIcao: string | null
    arrIcao: string | null
  }> = []
  let dashboardAirportCodes: string[] = []

  const liveFlights = await prisma.liveFlight.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: {
      id: true,
      callsign: true,
      phase: true,
      lat: true,
      lng: true,
      heading: true,
      depIcao: true,
      arrIcao: true,
    },
  })

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, message: true },
  })
  let selectedAirlineFeed: Array<{
    id: string
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    submittedAt: Date
    route_ref: { flightNumber: string; depIcao: string; arrIcao: string } | null
    pilot: { callsign: string } | null
  }> = []

  if (activeAirlineId) {
    const airlineRoutes = await prisma.route.findMany({
      where: { airlineId: activeAirlineId, active: true },
      select: { depIcao: true, arrIcao: true },
      take: 200,
    })

    const airportCodes = Array.from(
      new Set(
        airlineRoutes.flatMap((r) => [r.depIcao, r.arrIcao]).filter(Boolean)
      )
    )
    dashboardAirportCodes = airportCodes

    selectedAirlineEvents = await prisma.event.findMany({
      where: {
        active: true,
        airlineId: activeAirlineId,
      },
      orderBy: { startDate: 'asc' },
      take: 3,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        startDate: true,
        depIcao: true,
        arrIcao: true,
      },
    })

    selectedAirlineFeed = await prisma.pirep.findMany({
      where: { route_ref: { airlineId: activeAirlineId } },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        route_ref: {
          select: { flightNumber: true, depIcao: true, arrIcao: true },
        },
        pilot: { select: { callsign: true } },
      },
    }) as Array<{
      id: string
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
      submittedAt: Date
      route_ref: { flightNumber: string; depIcao: string; arrIcao: string } | null
      pilot: { callsign: string } | null
    }>
  }

  const selectedAirlinePosts = activeAirlineId
    ? await prisma.airlinePost.findMany({
        where: { airlineId: activeAirlineId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
      })
    : []

  const notificationIcaoCodes = Array.from(
    new Set(
      notifications
        .flatMap((note) => `${note.title} ${note.message}`.toUpperCase().match(/\b[A-Z]{4}\b/g) ?? [])
        .filter(Boolean),
    ),
  )

  const mapAirportLookupCodes = Array.from(
    new Set([...dashboardAirportCodes, ...notificationIcaoCodes]),
  )

  const mapAirports = mapAirportLookupCodes.length
    ? await prisma.airport.findMany({
        where: { icao: { in: mapAirportLookupCodes } },
        select: { icao: true, name: true, lat: true, lng: true },
      })
    : []

  const airportByIcao = new Map(mapAirports.map((airport) => [airport.icao.toUpperCase(), airport]))

  const eventMapPoints = selectedAirlineEvents
    .map((event) => {
      const dep = event.depIcao ? airportByIcao.get(event.depIcao.toUpperCase()) : null
      const arr = event.arrIcao ? airportByIcao.get(event.arrIcao.toUpperCase()) : null
      const anchor = dep ?? arr
      if (!anchor) return null
      return {
        id: `event-${event.id}`,
        lat: anchor.lat,
        lng: anchor.lng,
        title: event.title,
        subtitle: `${event.depIcao || '—'} -> ${event.arrIcao || '—'}`,
      }
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; subtitle: string }>

  const notificationMapPoints = notifications
    .map((note) => {
      const code = `${note.title} ${note.message}`.toUpperCase().match(/\b[A-Z]{4}\b/)?.[0]
      if (!code) return null
      const airport = airportByIcao.get(code)
      if (!airport) return null
      return {
        id: `notification-${note.id}`,
        lat: airport.lat,
        lng: airport.lng,
        title: note.title,
        subtitle: code,
      }
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; subtitle: string }>

  const notamMapPoints = dashboardAirportCodes
    .slice(0, 20)
    .map((icao, index) => {
      const airport = airportByIcao.get(icao.toUpperCase())
      if (!airport) return null
      return {
        id: `notam-${icao}-${index}`,
        lat: airport.lat,
        lng: airport.lng,
        title: `NOTAM ${icao}`,
        subtitle: 'Operational notice available',
      }
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; subtitle: string }>

  const liveFlightMapPoints = liveFlights.map((flight) => ({
    id: `live-${flight.id}`,
    lat: flight.lat,
    lng: flight.lng,
    title: flight.callsign,
    subtitle: `${flight.depIcao} -> ${flight.arrIcao} · ${flight.phase}`,
    heading: flight.heading,
  }))

  const stats = [
    { label: 'Total Hours', value: pilot.totalHours.toFixed(1), icon: Clock, color: 'text-sky-400' },
    { label: 'Total Flights', value: pilot.totalFlights, icon: Plane, color: 'text-indigo-400' },
    { label: 'Total Points', value: pilot.totalPoints.toLocaleString(), icon: Star, color: 'text-amber-400' },
    { label: 'Avg. Landing Rate', value: pilot.avgLandingRate ? `${Math.round(pilot.avgLandingRate)} fpm` : '—', icon: TrendingUp, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {pilot.firstName}!
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            <span className="font-mono text-sky-400">{pilot.callsign}</span>
            {pilot.rank && <span className="ml-2 text-slate-500">· {pilot.rank.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestBooking && (
            <Link href={`/booking/${latestBooking.id}`} className="btn-secondary">
              View Your Booking
            </Link>
          )}
          <Link href="/dashboard/book" className="btn-primary">
            <Plane className="w-4 h-4" />
            Book a Flight
          </Link>
        </div>
      </div>

      <DashboardOpsMap
        liveFlights={liveFlightMapPoints}
        events={eventMapPoints}
        notifications={notificationMapPoints}
      />

      {/* Stat cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent flights */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Flights</h2>
            <Link href="/dashboard/pireps" className="text-xs text-sky-400 hover:text-sky-300">View all →</Link>
          </div>
          {pilot.pireps.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No flights yet. Book your first flight!</p>
              <Link href="/dashboard/book" className="btn-primary mt-3 text-sm inline-flex">
                Book a Flight
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {pilot.pireps.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex-shrink-0">
                    {p.status === 'ACCEPTED' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    {p.status === 'PENDING' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {p.status === 'REJECTED' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-900 dark:text-white">{p.flightNumber}</span>
                      <span className="text-slate-500 text-xs">{p.depIcao} → {p.arrIcao}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDistanceToNow(new Date(p.submittedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{Math.floor(p.flightTime / 60)}h {p.flightTime % 60}m</div>
                    {p.score > 0 && <div className="text-xs text-amber-400">{p.score} pts</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* PIREP status */}
          <div className="card">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">PIREP Status</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Accepted</span>
                <span className="text-sm font-medium text-emerald-400">{acceptedPireps}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Pending Review</span>
                <span className="text-sm font-medium text-amber-400">{pendingPireps}</span>
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                Events
              </h2>
              <Link href="/dashboard/events" className="text-xs text-sky-400 hover:text-sky-300">All →</Link>
            </div>
            {!activeAirlineId ? (
              <p className="text-xs text-slate-500">Select an airline to see matching events.</p>
            ) : selectedAirlineEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No matching events for your selected airline yet.</p>
            ) : (
              <div className="space-y-4">
                {selectedAirlineEvents.map((ev) => (
                  <div key={ev.id} className="overflow-hidden rounded-lg bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                    {ev.imageUrl && (
                      <img src={ev.imageUrl} alt={ev.title} className="w-full h-[240px] object-cover" />
                    )}
                    <div className="p-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{ev.title}</div>
                      <div className="text-xs text-slate-500 mt-1" suppressHydrationWarning>{ev.depIcao || '—'}{ev.arrIcao ? ` → ${ev.arrIcao}` : ''} · {formatDistanceToNow(new Date(ev.startDate), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NOTAM */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                NOTAM
              </h2>
            </div>
            {!activeAirlineId ? (
              <p className="text-xs text-slate-500">Select an airline to see NOTAMs.</p>
            ) : selectedAirlinePosts.length === 0 ? (
              <p className="text-xs text-slate-500">No NOTAMs for your selected airline.</p>
            ) : (
              <div className="space-y-4">
                {selectedAirlinePosts.map((post) => (
                  <Link key={post.id} href={`/airline/feed/${post.id}`}>
                    <div className="overflow-hidden rounded-lg bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      {post.imageUrl && (
                        <img src={post.imageUrl} alt={post.title} className="w-full h-[240px] object-cover" />
                      )}
                      <div className="p-3">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{post.title}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{post.description}</div>
                        <div className="text-xs text-slate-400 mt-1" suppressHydrationWarning>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
