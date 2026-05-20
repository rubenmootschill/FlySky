import { redirect } from 'next/navigation'

export default async function LegacyDispatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/dispatch/${id}`)
}
