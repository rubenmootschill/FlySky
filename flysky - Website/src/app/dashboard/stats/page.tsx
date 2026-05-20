import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { BarChart3, Clock, Plane, Star, TrendingUp, Target } from 'lucide-react'
import { StatsChart } from '@/components/stats/stats-chart'

export default async function StatsPage() {
  const session = await requireAuth()
  const pilot = await prisma.pilot.findUnique({
    where: { userId: session.user.id },
    include: {
      rank: true,
      badges: { include: { badge: true } },
      pireps: {
        where: { status: 'ACCEPTED' },
        orderBy: { submittedAt: 'asc' },
        select: {
          submittedAt: true,
          flightTime: true,
          score: true,
          landingRate: true,
          depIcao: true,
          arrIcao: true,
          flightNumber: true,
        },
      },
    },
  })

  if (!pilot) return <div className="text-slate-400">Pilot not found</div>

  const bestLanding = pilot.pireps
    .filter((p) => p.landingRate !== null)
    .sort((a, b) => Math.abs(a.landingRate!) - Math.abs(b.landingRate!))[0]

  const worstLanding = pilot.pireps
    .filter((p) => p.landingRate !== null)
    .sort((a, b) => Math.abs(b.landingRate!) - Math.abs(a.landingRate!))[0]

  // Monthly hours data for chart
  const monthlyData = pilot.pireps.reduce<Record<string, number>>((acc, p) => {
    const month = new Date(p.submittedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    acc[month] = (acc[month] ?? 0) + p.flightTime / 60
    return acc
  }, {})

  const chartData = Object.entries(monthlyData).map(([month, hours]) => ({ month, hours: parseFloat(hours.toFixed(1)) }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">My Statistics</h1>
        <p className="section-subtitle mt-1">Detailed breakdown of your flying career</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Hours', value: pilot.totalHours.toFixed(1) + 'h', icon: Clock, color: 'text-sky-400' },
          { label: 'Total Flights', value: pilot.totalFlights, icon: Plane, color: 'text-indigo-400' },
          { label: 'Total Points', value: pilot.totalPoints.toLocaleString(), icon: Star, color: 'text-amber-400' },
          { label: 'Avg Landing', value: pilot.avgLandingRate ? Math.round(pilot.avgLandingRate) + ' fpm' : '—', icon: TrendingUp, color: 'text-emerald-400' },
        ].map((s) => (
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
        {/* Hours chart */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" /> Hours Flown by Month
          </h2>
          <StatsChart data={chartData} />
        </div>

        {/* Landing records */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400" /> Landing Records
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Best Landing</div>
              <div className="text-xl font-bold text-emerald-400">
                {bestLanding?.landingRate !== undefined ? `${Math.round(bestLanding.landingRate!)} fpm` : '—'}
              </div>
              {bestLanding && <div className="text-xs text-slate-500 mt-1">{bestLanding.flightNumber} · {bestLanding.depIcao}→{bestLanding.arrIcao}</div>}
            </div>
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Hardest Landing</div>
              <div className="text-xl font-bold text-red-400">
                {worstLanding?.landingRate !== undefined ? `${Math.round(worstLanding.landingRate!)} fpm` : '—'}
              </div>
              {worstLanding && <div className="text-xs text-slate-500 mt-1">{worstLanding.flightNumber} · {worstLanding.depIcao}→{worstLanding.arrIcao}</div>}
            </div>
          </div>

          {/* Badges */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Earned Badges</div>
            {pilot.badges.length === 0 ? (
              <p className="text-xs text-slate-600">No badges yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pilot.badges.map(({ badge }) => (
                  <div key={badge.id} title={badge.description}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ color: badge.color, backgroundColor: `${badge.color}20` }}
                  >
                    {badge.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
