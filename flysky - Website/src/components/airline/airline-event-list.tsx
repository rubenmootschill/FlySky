"use client"

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Award, Check, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

type AirlineEvent = {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  startDate: string | Date
  endDate: string | Date
  depIcao?: string | null
  arrIcao?: string | null
  active: boolean
}

type EventFormState = {
  title: string
  description: string
  type: 'announcement' | 'tour'
  depIcao: string
  arrIcao: string
  startDate: string
  endDate: string
  imageUrl: string
}

const emptyForm: EventFormState = {
  title: '',
  description: '',
  type: 'announcement',
  depIcao: '',
  arrIcao: '',
  startDate: '',
  endDate: '',
  imageUrl: '',
}

function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function toDisplayDate(value: string | Date | null | undefined) {
  if (!value) return '∞'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '∞'
  return format(date, 'dd/MM/yyyy')
}

function getEventType(event: AirlineEvent) {
  return event.depIcao && event.arrIcao ? 'tour' : 'announcement'
}

export default function AirlineEventList({ initialEvents, airlineId }: { initialEvents: AirlineEvent[]; airlineId: string }) {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormState>(emptyForm)

  const { data: events = initialEvents, isLoading } = useQuery<AirlineEvent[]>({
    queryKey: ['airline-events', airlineId],
    queryFn: async () => {
      const res = await fetch('/api/airline/events')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load events')
      return data
    },
    initialData: initialEvents,
    refetchInterval: 5000,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const isEdit = Boolean(editingEventId)
      const endpoint = isEdit ? `/api/airline/events/${editingEventId}` : '/api/airline/events'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save event')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-events', airlineId] })
      toast.success(editingEventId ? 'Event updated' : 'Event created')
      setShowForm(false)
      setEditingEventId(null)
      setForm(emptyForm)
    },
    onError: (error: any) => toast.error(error.message || 'Failed to save event'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (event: AirlineEvent) => {
      const res = await fetch(`/api/airline/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !event.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update event status')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-events', airlineId] })
      toast.success('Event status updated')
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update event status'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/airline/events/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete event')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-events', airlineId] })
      toast.success('Event deleted')
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete event'),
  })

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return events
    return events.filter((event) => {
      return [event.title, event.description, event.depIcao || '', event.arrIcao || '', getEventType(event)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [events, search])

  const openCreate = () => {
    setEditingEventId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (event: AirlineEvent) => {
    setEditingEventId(event.id)
    setForm({
      title: event.title,
      description: event.description,
      type: getEventType(event),
      depIcao: event.depIcao || '',
      arrIcao: event.arrIcao || '',
      startDate: toDateInputValue(event.startDate),
      endDate: toDateInputValue(event.endDate),
      imageUrl: event.imageUrl || '',
    })
    setShowForm(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setForm((prev) => ({ ...prev, imageUrl: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim() || !form.description.trim() || !form.startDate || !form.endDate) {
      toast.error('Title, description, start and end date are required')
      return
    }

    if (form.type === 'tour' && (!form.depIcao.trim() || !form.arrIcao.trim())) {
      toast.error('Tour events require departure and arrival ICAO')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      depIcao: form.type === 'tour' ? (form.depIcao.trim().toUpperCase() || null) : null,
      arrIcao: form.type === 'tour' ? (form.arrIcao.trim().toUpperCase() || null) : null,
      imageUrl: form.imageUrl.trim() || undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    }

    saveMutation.mutate(payload)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="section-title">Events</h1>

        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="btn-secondary border-sky-500/40 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300">
            <Plus className="h-4 w-4" />
            CREATE EVENT
          </button>

          <div className="relative w-64">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="input h-10 pr-10"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card rounded-md p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              {editingEventId ? 'Edit Event' : 'Create Event'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingEventId(null)
                setForm(emptyForm)
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" /> Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="input"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <select
              className="input"
              value={form.type}
              onChange={(e) => {
                const nextType = e.target.value as 'announcement' | 'tour'
                setForm((prev) => ({
                  ...prev,
                  type: nextType,
                  depIcao: nextType === 'tour' ? prev.depIcao : '',
                  arrIcao: nextType === 'tour' ? prev.arrIcao : '',
                }))
              }}
            >
              <option value="announcement">Announcement</option>
              <option value="tour">Tour</option>
            </select>
            <textarea
              className="input md:col-span-2"
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div className="md:col-span-2 space-y-2">
              <label className="label mb-0">Image</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-secondary cursor-pointer">
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {form.imageUrl ? (
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-red-500"
                    onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                  >
                    Remove image
                  </button>
                ) : null}
              </div>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Event preview" className="h-20 w-20 rounded object-cover border border-slate-200 dark:border-slate-700" />
              ) : null}
            </div>
            {form.type === 'tour' ? (
              <>
                <input
                  className="input"
                  placeholder="Departure ICAO"
                  value={form.depIcao}
                  onChange={(e) => setForm((prev) => ({ ...prev, depIcao: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Arrival ICAO"
                  value={form.arrIcao}
                  onChange={(e) => setForm((prev) => ({ ...prev, arrIcao: e.target.value }))}
                />
              </>
            ) : null}
            <input
              type="datetime-local"
              className="input"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
            <input
              type="datetime-local"
              className="input"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingEventId ? 'Save Event' : 'Create Event'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid grid-cols-[2.2fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-sky-400">
          <span>Event Title</span>
          <span>Type</span>
          <span>Started</span>
          <span>Closed</span>
          <span>Start Date</span>
          <span>End Date</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading && filteredEvents.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">No events found.</div>
        ) : (
          <div>
            {filteredEvents.map((event) => {
              const now = Date.now()
              const startTs = new Date(event.startDate).getTime()
              const endTs = new Date(event.endDate).getTime()
              const started = Number.isFinite(startTs) ? now >= startTs : false
              const closed = Number.isFinite(endTs) ? now > endTs || !event.active : !event.active

              return (
                <div
                  key={event.id}
                  className="grid grid-cols-[2.2fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr] items-center border-b border-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-400" />
                    <span className="truncate">{event.title}</span>
                  </div>
                  <span className="lowercase text-slate-500 dark:text-slate-400">{getEventType(event)}</span>
                  <span>{started ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />}</span>
                  <span>{closed ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />}</span>
                  <span className="text-slate-500 dark:text-slate-400">{toDisplayDate(event.startDate)}</span>
                  <span className="text-slate-500 dark:text-slate-400">{toDisplayDate(event.endDate)}</span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleMutation.mutate(event)}
                      className="text-sky-500 hover:text-sky-400"
                      title={event.active ? 'Deactivate event' : 'Activate event'}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(event.id)}
                      className="text-red-500 hover:text-red-400"
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(event)} className="text-emerald-500 hover:text-emerald-400" title="Edit event">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}