import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FileText, Plus, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const statusConfig = {
  ACCEPTED: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Accepted' },
  PENDING: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Pending' },
  REJECTED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Rejected' },
}

export default async function PirepsPage() {
  const session = await requireAuth()
  const pilot = await prisma.pilot.findUnique({ where: { userId: session.user.id } })

  const pireps = pilot
    ? await prisma.pirep.findMany({
        where: { pilotId: pilot.id },
        orderBy: { submittedAt: 'desc' },
        include: { route_ref: true },
      })
    : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">My PIREPs</h1>
          <p className="section-subtitle mt-1">{pireps.length} total flight reports</p>
        </div>
        <Link href="/dashboard/book" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Flight
        </Link>
      </div>

      {pireps.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No PIREPs yet. Complete a flight to submit your first report.</p>
          <Link href="/dashboard/book" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Book a Flight
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Flight</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Landing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Points</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Filed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pireps.map((p) => {
                const sc = statusConfig[p.status]
                return (
                  <tr key={p.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <span className={`badge-status gap-1.5 ${sc.color} ${sc.bg}`}>
                        <sc.icon className="w-3 h-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-sky-400">{p.flightNumber}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-slate-300">{p.depIcao} → {p.arrIcao}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {Math.floor(p.flightTime / 60)}h {p.flightTime % 60}m
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm font-mono text-slate-300">
                        {p.landingRate !== null ? `${Math.round(p.landingRate)} fpm` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-amber-400">{p.score}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                      {formatDistanceToNow(new Date(p.submittedAt), { addSuffix: true })}
                    </td>
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
