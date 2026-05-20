'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useState } from 'react'

interface Pirep {
  id: string
  flightNumber: string
  depIcao: string
  arrIcao: string
  flightTime: number
  landingRate: number | null
  score: number
  status: string
  submittedAt: string
  pilot: { callsign: string; firstName: string; lastName: string }
}

function RelativeTime({ value }: { value: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <span suppressHydrationWarning>
      {mounted ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '...'}
    </span>
  )
}

export default function AdminPirepsPage() {
  const qc = useQueryClient()

  const { data: pireps, isLoading } = useQuery<Pirep[]>({
    queryKey: ['admin-pireps'],
    queryFn: () => fetch('/api/admin/pireps').then((r) => r.json()),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      fetch(`/api/admin/pireps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).then((r) => r.json()),
    onSuccess: (_, { action }) => {
      toast.success(action === 'accept' ? 'PIREP accepted!' : 'PIREP rejected')
      qc.invalidateQueries({ queryKey: ['admin-pireps'] })
    },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">PIREP Review</h1>
        <p className="section-subtitle mt-1">
          {isLoading ? 'Loading…' : `${pireps?.filter((p) => p.status === 'PENDING').length ?? 0} pending`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-sky-400" /></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Pilot</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Flight</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Landing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Filed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pireps?.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    {p.status === 'PENDING' && <span className="badge-status bg-amber-400/10 text-amber-400 gap-1"><Clock className="w-3 h-3" />Pending</span>}
                    {p.status === 'ACCEPTED' && <span className="badge-status bg-emerald-400/10 text-emerald-400 gap-1"><CheckCircle className="w-3 h-3" />Accepted</span>}
                    {p.status === 'REJECTED' && <span className="badge-status bg-red-400/10 text-red-400 gap-1"><XCircle className="w-3 h-3" />Rejected</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900 dark:text-white">{p.pilot.firstName} {p.pilot.lastName}</div>
                    <div className="text-xs font-mono text-sky-400">{p.pilot.callsign}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm text-sky-400">{p.flightNumber}</div>
                    <div className="text-xs text-slate-500">{p.depIcao} → {p.arrIcao}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-300">
                    {Math.floor(p.flightTime / 60)}h {p.flightTime % 60}m
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm font-mono text-slate-300">
                    {p.landingRate !== null ? `${Math.round(p.landingRate)} fpm` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-400">{p.score}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">
                    <RelativeTime value={p.submittedAt} />
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewMutation.mutate({ id: p.id, action: 'accept' })}
                          disabled={reviewMutation.isPending}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                          title="Accept"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => reviewMutation.mutate({ id: p.id, action: 'reject' })}
                          disabled={reviewMutation.isPending}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
