import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { Users, Plane } from 'lucide-react'

export default async function PilotsPage() {
  await requireAuth()
  const pilots = await prisma.pilot.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { callsign: 'asc' },
    include: { rank: true },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">Pilot Roster</h1>
        <p className="section-subtitle mt-1">{pilots.length} active pilots</p>
      </div>

      {pilots.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No pilots yet. Be the first to join!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pilots.map((pilot) => (
            <div key={pilot.id} className="card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-sky-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sky-400 font-bold text-sm">
                    {pilot.firstName.charAt(0)}{pilot.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">{pilot.firstName} {pilot.lastName}</div>
                  <div className="font-mono text-xs text-sky-400">{pilot.callsign}</div>
                </div>
                {pilot.rank && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded"
                    style={{ color: pilot.rank.color, backgroundColor: `${pilot.rank.color}20` }}
                  >
                    {pilot.rank.code}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{pilot.totalFlights}</div>
                  <div className="text-xs text-slate-500">Flights</div>
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{pilot.totalHours.toFixed(0)}h</div>
                  <div className="text-xs text-slate-500">Hours</div>
                </div>
                <div>
                  <div className="text-base font-bold text-amber-400">{pilot.totalPoints.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Points</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-slate-500">
                <Plane className="w-3 h-3" />
                Hub: {pilot.hub}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
