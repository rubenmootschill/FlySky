import { redirect } from 'next/navigation'

export default async function LegacyRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bookingId?: string }>
}) {
  const { id } = await params
  const { bookingId } = await searchParams
  const qs = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : ''

  redirect(`/dashboard/routes/${id}${qs}`)
}
