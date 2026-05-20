import { prisma } from '@/lib/prisma'
import { Trophy, Medal, Star, Clock, Plane } from 'lucide-react'

export default async function LeaderboardPage() {
  const pilots = await prisma.pilot.findMany({
    where: { status: 'ACTIVE', totalFlights: { gt: 0 } },
    orderBy: { totalPoints: 'desc' },
    take: 50,
    include: { rank: true },
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">Leaderboard</h1>
        <p className="section-subtitle mt-1">Top pilots ranked by total points</p>
      </div>

      {pilots.length === 0 ? (
        <div className="card text-center py-16">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No flights yet. Be the first to top the board!</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="w-12 px-4 py-3 text-xs font-medium text-slate-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Pilot</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Rank</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">
                  <div className="flex items-center justify-end gap-1"><Star className="w-3 h-3" />Points</div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">
                  <div className="flex items-center justify-end gap-1"><Clock className="w-3 h-3" />Hours</div>
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">
                  <div className="flex items-center justify-end gap-1"><Plane className="w-3 h-3" />Flights</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pilots.map((pilot, i) => (
                <tr key={pilot.id} className="table-row-hover">
                  <td className="px-4 py-3 text-center">
                    {i === 0 ? <Trophy className="w-5 h-5 text-amber-400 mx-auto" /> :
                     i === 1 ? <Medal className="w-5 h-5 text-slate-300 mx-auto" /> :
                     i === 2 ? <Medal className="w-5 h-5 text-amber-700 mx-auto" /> :
                     <span className="text-sm text-slate-500">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sky-400 text-xs font-bold">
                          {pilot.firstName.charAt(0)}{pilot.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{pilot.firstName} {pilot.lastName}</div>
                        <div className="text-xs font-mono text-sky-400">{pilot.callsign}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {pilot.rank ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{ color: pilot.rank.color, backgroundColor: `${pilot.rank.color}20` }}
                      >
                        {pilot.rank.name}
                      </span>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-amber-400">{pilot.totalPoints.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span className="text-sm text-slate-300">{pilot.totalHours.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span className="text-sm text-slate-300">{pilot.totalFlights}</span>
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
