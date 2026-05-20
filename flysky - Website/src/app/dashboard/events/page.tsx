import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function EventsPage() {
  await requireAuth()
  const events = await prisma.event.findMany({
    where: { active: true },
    orderBy: { startDate: 'asc' },
  })
  const goals = await prisma.communityGoal.findMany({
    where: { active: true },
    orderBy: { endDate: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Events & Community Goals</h1>
        <p className="section-subtitle mt-1">Fly together, achieve together</p>
      </div>

      {/* Community Goals */}
      {goals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Community Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const flightProgress = Math.min(100, Math.round((goal.currentFlights / goal.targetFlights) * 100))
              const hoursProgress = Math.min(100, Math.round((goal.currentHours / goal.targetHours) * 100))
              return (
                <div key={goal.id} className="card">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{goal.title}</h3>
                  <p className="text-sm text-slate-400 mb-4">{goal.description}</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Flights</span>
                        <span>{goal.currentFlights} / {goal.targetFlights}</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${flightProgress}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Hours</span>
                        <span>{goal.currentHours.toFixed(1)} / {goal.targetHours}</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${hoursProgress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    Ends {formatDistanceToNow(new Date(goal.endDate), { addSuffix: true })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Events */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming Events</h2>
        {events.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500">No events scheduled. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div key={ev.id} className="card-hover">
                {ev.imageUrl && (
                  <img src={ev.imageUrl} alt={ev.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-slate-400">{new Date(ev.startDate).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{ev.title}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{ev.description}</p>
                {(ev.depIcao || ev.arrIcao) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {ev.depIcao}{ev.arrIcao ? ` → ${ev.arrIcao}` : ''}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(ev.startDate), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
