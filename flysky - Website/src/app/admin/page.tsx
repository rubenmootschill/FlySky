import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Users, Plane, FileText, Route, Shield, CheckCircle, Clock, Building2 } from 'lucide-react'

export default async function AdminPage() {
  const [totalPilots, totalFlights, pendingPireps, totalRoutes, activeFlights] = await Promise.all([
    prisma.pilot.count(),
    prisma.pirep.count({ where: { status: 'ACCEPTED' } }),
    prisma.pirep.count({ where: { status: 'PENDING' } }),
    prisma.route.count({ where: { active: true } }),
    prisma.liveFlight.count(),
  ])

  const recentPireps = await prisma.pirep.findMany({
    where: { status: 'PENDING' },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    include: { pilot: { select: { callsign: true, firstName: true, lastName: true } } },
  })

  const stats = [
    { label: 'Total Pilots', value: totalPilots, icon: Users, color: 'text-sky-400', href: '/admin/pilots' },
    { label: 'Accepted Flights', value: totalFlights, icon: CheckCircle, color: 'text-emerald-400', href: '/admin/pireps' },
    { label: 'Pending PIREPs', value: pendingPireps, icon: Clock, color: 'text-amber-400', href: '/admin/pireps' },
    { label: 'Active Airports', value: totalRoutes, icon: Route, color: 'text-indigo-400', href: '/admin/airports' },
    { label: 'Live Flights', value: activeFlights, icon: Plane, color: 'text-emerald-400', href: '/dashboard/tracking' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h1 className="section-title">Admin Control Room</h1>
          <p className="section-subtitle mt-0.5">Manage your virtual airline operations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="stat-card hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{s.label}</span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/admin/pireps', icon: FileText, label: 'Review PIREPs', badge: pendingPireps > 0 ? pendingPireps : undefined },
          { href: '/admin/pilots', icon: Users, label: 'Manage Pilots' },
          { href: '/admin/airports', icon: Route, label: 'Manage Airports' },
          { href: '/admin/fleet', icon: Plane, label: 'Manage Fleet' },
          { href: '/admin/airlines', icon: Building2, label: 'Airline Applications' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card-hover flex items-center gap-3 relative">
            <item.icon className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</span>
            {item.badge && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-amber-400 text-slate-900 rounded-full text-xs font-bold flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Pending PIREPs */}
      {recentPireps.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-white">Pending PIREP Review</h2>
            <Link href="/admin/pireps" className="text-xs text-sky-400 hover:text-sky-300">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentPireps.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-mono text-sm text-sky-400 mr-2">{p.flightNumber}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{p.depIcao} → {p.arrIcao}</span>
                  <div className="text-xs text-slate-600 dark:text-slate-500">{p.pilot.callsign} · {p.pilot.firstName} {p.pilot.lastName}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/pireps/${p.id}`} className="btn-secondary text-xs py-1 px-2">
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
