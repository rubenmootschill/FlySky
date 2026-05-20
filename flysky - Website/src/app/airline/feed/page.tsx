import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { resolveActiveAirlineId } from '@/lib/active-airline'


import CreateNotamForm from '@/components/airline/create-event-form'
import AirlineNotamList from '@/components/airline/airline-notam-list'

export default async function AirlineFeedPage() {
  const session = await requireAuth()
  const selectedAirlineId = await resolveActiveAirlineId(session.user)
  if (!selectedAirlineId) redirect('/dashboard')

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  })
  if (!airline) redirect('/dashboard')

  // Fetch NOTAMs for this airline
  const notams = await prisma.airlineNotam.findMany({
    where: { airlineId: airline.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="section-title">Airline NOTAMs</h1>

      <CreateNotamForm />

      {/* NOTAMs Section - Client Component for Auto-Refresh */}
      <AirlineNotamList initialEvents={notams} airlineId={airline.id} />
    </div>
  )
}
