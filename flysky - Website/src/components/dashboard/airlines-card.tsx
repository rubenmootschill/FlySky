'use client'
import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Star, Building2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Membership {
  airlineId: string
  airline: { id: string; name: string; callsignPrefix: string }
}

interface Props {
  memberships: Membership[]
  activeAirlineId: string | null
}

export function AirlinesCard({ memberships, activeAirlineId }: Props) {
  const queryClient = useQueryClient()
  const [active, setActive] = useState(activeAirlineId)

  const selectMutation = useMutation({
    mutationFn: (airlineId: string) =>
      fetch('/api/pilot/airline/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ airlineId }),
      }).then((r) => r.json()),
    onSuccess: (_, airlineId) => {
      setActive(airlineId)
      queryClient.invalidateQueries({ queryKey: ['current-pilot'] })
      toast.success('Active airline switched')
    },
    onError: () => toast.error('Failed to switch airline'),
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">Airlines</h2>
        <Link href="/dashboard/airlines" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
          Browse <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-4">
          <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 mb-3">You haven't joined any airlines yet</p>
          <Link
            href="/dashboard/airlines"
            className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            Browse Airlines →
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {memberships.map((m) => {
            const isActive = active === m.airlineId
            return (
              <button
                key={m.airlineId}
                onClick={() => !isActive && selectMutation.mutate(m.airlineId)}
                disabled={isActive || selectMutation.isPending}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 cursor-default'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  isActive ? 'bg-sky-500/20 text-sky-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {m.airline.callsignPrefix.slice(0, 2)}
                </div>
                <span className="flex-1 truncate font-medium">{m.airline.name}</span>
                {isActive && <Star className="w-3.5 h-3.5 text-sky-400 fill-sky-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
