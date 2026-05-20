import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { List, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { resolveActiveAirlineId } from '@/lib/active-airline'

const STATUS_META: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  ACCEPTED: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PENDING:  { icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  REJECTED: { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10'    },
}

export default async function AirlineFlightsPage() {
  const session = await requireAuth()
  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) redirect('/dashboard')

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })
  if (!airline) redirect('/dashboard')

  const pireps = await prisma.pirep.findMany({
    where: { route_ref: { airlineId: airline.id } },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    include: {
      pilot: { select: { callsign: true } },
      route_ref: { select: { flightNumber: true, depIcao: true, arrIcao: true } },
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <List className="w-5 h-5 text-sky-400" />
          <h1 className="section-title">All Flights</h1>
        </div>
        <span className="text-sm text-slate-500">{pireps.length} recent</span>
      </div>

      {pireps.length === 0 ? (
        <div className="card text-center py-12 text-slate-500">No flights logged yet.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Flight</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Route</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Pilot</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {pireps.map((p) => {
                const meta = STATUS_META[p.status] ?? STATUS_META['PENDING']
                const Icon = meta.icon
                return (
                  <tr key={p.id} className="table-row-hover border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <div className={`w-6 h-6 rounded-full ${meta.bg} flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-white font-medium">{p.route_ref?.flightNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.route_ref ? (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="font-mono text-xs">{p.route_ref.depIcao}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-mono text-xs">{p.route_ref.arrIcao}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.pilot?.callsign}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">{formatDistanceToNow(new Date(p.submittedAt), { addSuffix: true })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
