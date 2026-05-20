"use client"
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

interface AirlineNotam {
  id: string
  title: string
  body: string
  severity: string
  createdAt: string | Date
}

interface AirlineNotamListProps {
  initialEvents: AirlineNotam[]
  airlineId: string
}

export default function AirlineNotamList({ initialEvents, airlineId }: AirlineNotamListProps) {
  const { data: notams = initialEvents, isLoading } = useQuery({
    queryKey: ['airline-notams', airlineId],
    queryFn: async () => {
      const res = await fetch(`/api/airline/notams`)
      if (!res.ok) throw new Error('Failed to fetch NOTAMs')
      return res.json() as Promise<AirlineNotam[]>
    },
    initialData: initialEvents,
    refetchInterval: 3000,
  })

  if (isLoading && notams.length === 0) {
    return <div className="text-center py-6 text-slate-500">Loading NOTAMs...</div>
  }

  if (notams.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        <p>No NOTAMs yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Latest NOTAMs</h2>
      {notams.map((notam: AirlineNotam) => (
        <div key={notam.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              notam.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
              notam.severity === 'WARNING' ? 'bg-amber-400 text-white' :
              notam.severity === 'ADVISORY' ? 'bg-blue-400 text-white' :
              'bg-slate-200 text-slate-700'
            }`}>
              {notam.severity}
            </span>
            <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(notam.createdAt), { addSuffix: true })}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{notam.title}</h3>
          <p className="text-xs text-slate-600 mt-2 line-clamp-4">{notam.body}</p>
        </div>
      ))}
    </div>
  )
}
