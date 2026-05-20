'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import { FileText, Plane, Loader2, Clock, Fuel } from 'lucide-react'
import toast from 'react-hot-toast'

function PirepForm() {
  const router = useRouter()
  const params = useSearchParams()
  const bookingIdParam = params.get('bookingId')
  const bookingId =
    bookingIdParam && bookingIdParam !== 'undefined' && bookingIdParam !== 'null'
      ? bookingIdParam
      : null

  const { data: booking, isLoading: loadingBooking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`)
      if (!res.ok) {
        throw new Error('Booking not found')
      }

      return res.json()
    },
    enabled: !!bookingId,
  })

  const nowLocal = () => {
    const d = new Date()
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  }

  const [form, setForm] = useState({
    depTime: nowLocal(),
    arrTime: nowLocal(),
    landingRate: '',
    fuelUsed: '',
    passengerCount: '',
    network: 'offline',
    callsign: '',
    route: '',
    remarks: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingId) { toast.error('No booking selected'); return }
    if (!booking) { toast.error('Booking not loaded'); return }
    setSubmitting(true)
    const res = await fetch('/api/pireps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, bookingId }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.ok) {
      toast.success('PIREP submitted! Awaiting review.')
      router.push('/dashboard/pireps')
    } else {
      toast.error(data.error ?? 'Submission failed')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="section-title">Submit PIREP</h1>
        <p className="section-subtitle mt-1">File your flight report after landing</p>
      </div>

      {!bookingId && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-300">
          Missing or invalid booking ID. Please book a flight first.
        </div>
      )}

      {loadingBooking && bookingId && (
        <div className="card text-slate-400">Loading booking...</div>
      )}

      {booking && (
        <div className="card bg-sky-500/5 border-sky-500/20">
          <div className="flex items-center gap-3">
            <Plane className="w-5 h-5 text-sky-400" />
            <div>
              <div className="font-mono font-bold text-sky-400">{booking.route?.flightNumber}</div>
              <div className="text-sm text-slate-300">
                {booking.route?.depIcao} → {booking.route?.arrIcao} &nbsp;·&nbsp; {booking.route?.depName} to {booking.route?.arrName}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Departure Time (UTC)
            </label>
            <input type="datetime-local" value={form.depTime} onChange={(e) => set('depTime', e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">
              <Clock className="w-3.5 h-3.5 inline mr-1" />Arrival Time (UTC)
            </label>
            <input type="datetime-local" value={form.arrTime} onChange={(e) => set('arrTime', e.target.value)} className="input" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Landing Rate (ft/min)</label>
            <input type="number" value={form.landingRate} onChange={(e) => set('landingRate', e.target.value)} className="input" placeholder="-150" />
            <p className="text-xs text-slate-500 mt-1">Negative value (e.g. -150)</p>
          </div>
          <div>
            <label className="label">
              <Fuel className="w-3.5 h-3.5 inline mr-1" />Fuel Used (kg)
            </label>
            <input type="number" value={form.fuelUsed} onChange={(e) => set('fuelUsed', e.target.value)} className="input" placeholder="8500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Passengers</label>
            <input type="number" value={form.passengerCount} onChange={(e) => set('passengerCount', e.target.value)} className="input" placeholder="150" min={0} />
          </div>
          <div>
            <label className="label">Network</label>
            <select value={form.network} onChange={(e) => set('network', e.target.value)} className="input">
              <option value="offline">Offline</option>
              <option value="VATSIM">VATSIM</option>
              <option value="IVAO">IVAO</option>
              <option value="POSCON">POSCON</option>
            </select>
          </div>
        </div>

        {form.network !== 'offline' && (
          <div>
            <label className="label">ATC Callsign</label>
            <input type="text" value={form.callsign} onChange={(e) => set('callsign', e.target.value.toUpperCase())} className="input font-mono" placeholder="FSK101" />
          </div>
        )}

        <div>
          <label className="label">Route Filed</label>
          <input type="text" value={form.route} onChange={(e) => set('route', e.target.value.toUpperCase())} className="input font-mono text-sm" placeholder="EGLL DCT DVR DCT LFPG" />
        </div>

        <div>
          <label className="label">Remarks (optional)</label>
          <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className="input resize-none h-20" placeholder="Any notes about the flight..." />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting || !bookingId || !booking}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {submitting ? 'Submitting…' : 'Submit PIREP'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SubmitPirepPage() {
  return (
    <Suspense>
      <PirepForm />
    </Suspense>
  )
}
