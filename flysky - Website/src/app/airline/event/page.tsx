import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { resolveActiveAirlineId } from '@/lib/active-airline';
import AirlineEventList from '@/components/airline/airline-event-list';

export default async function AirlineEventPage() {
  const session = await requireAuth();
  const selectedAirlineId = await resolveActiveAirlineId(session.user);
  if (!selectedAirlineId) redirect('/dashboard');

  const airline = await prisma.airline.findUnique({
    where: { id: selectedAirlineId },
  });
  if (!airline) redirect('/dashboard');

  const events = await prisma.event.findMany({
    where: { airlineId: airline.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="w-full max-w-none min-h-[calc(100vh-7rem)]">
      <AirlineEventList initialEvents={events} airlineId={airline.id} />
    </div>
  );
}