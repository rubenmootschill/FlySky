import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AirlinePortalSidebar from '@/components/airline/sidebar'
import { listAccessibleAirlines, resolveActiveAirlineId } from '@/lib/active-airline'

export default async function AirlineLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()

  const [airlines, selectedAirlineId] = await Promise.all([
    listAccessibleAirlines(session.user),
    resolveActiveAirlineId(session.user),
  ])

  if (!selectedAirlineId || airlines.length === 0) redirect('/dashboard')

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
    select: { id: true, name: true, callsignPrefix: true, hub: true },
  })

  if (!airline) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <AirlinePortalSidebar airline={airline} airlines={airlines} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
