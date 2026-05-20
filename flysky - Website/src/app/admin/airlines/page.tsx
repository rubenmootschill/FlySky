'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Building2, Globe, Mail, Users, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

type Application = {
  id: string
  airlineName: string
  callsignPrefix: string
  icaoCode: string | null
  logoUrl: string | null
  website: string | null
  description: string
  contactName: string
  contactEmail: string
  hub: string
  expectedPilots: number
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
  reviewNotes: string | null
  submittedAt: string
}

type Airline = {
  id: string
  name: string
  callsignPrefix: string
  icaoCode?: string
  hub: string
  status: string
  ownerEmail?: string
  website?: string
  _count: { routes: number; fleets: number }
}

const statusColor = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  SUSPENDED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function RelativeTime({ value }: { value: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <span suppressHydrationWarning>
      {mounted ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '...'}
    </span>
  )
}

export default function AdminAirlinesPage() {
  const qc = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerLogoFile, setBannerLogoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    callsignPrefix: '',
    icaoCode: '',
    hub: '',
    website: '',
    description: '',
    ownerEmail: '',
  })

  const { data: applications = [], isLoading: appLoading } = useQuery<Application[]>({
    queryKey: ['admin-airlines'],
    queryFn: () => fetch('/api/admin/airlines').then((r) => r.json()),
  })

  const { data: airlines = [], isLoading: airlinesLoading } = useQuery<Airline[]>({
    queryKey: ['admin-airlines-list'],
    queryFn: async () => {
      // Fetch airlines from the database directly via a database call
      // For now, return empty array as we'd need a new endpoint
      return []
    },
  })

  const { mutate: review } = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      fetch(`/api/admin/airlines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }).then((r) => r.json()),
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Airline approved & activated!' : 'Application rejected')
      qc.invalidateQueries({ queryKey: ['admin-airlines'] })
    },
  })

  const { mutate: createAirline, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const body = new FormData()
      body.append('name', formData.name)
      body.append('callsignPrefix', formData.callsignPrefix)
      body.append('icaoCode', formData.icaoCode)
      body.append('hub', formData.hub)
      body.append('website', formData.website)
      body.append('description', formData.description)
      body.append('ownerEmail', formData.ownerEmail)
      if (logoFile) body.append('logoFile', logoFile)
      if (bannerLogoFile) body.append('bannerLogoFile', bannerLogoFile)

      const response = await fetch('/api/admin/airlines', {
        method: 'POST',
        body,
      })

      return response.json()
    },
    onSuccess: () => {
      toast.success('Airline created successfully!')
      setFormData({
        name: '',
        callsignPrefix: '',
        icaoCode: '',
        hub: '',
        website: '',
        description: '',
        ownerEmail: '',
      })
      setLogoFile(null)
      setBannerLogoFile(null)
      setShowAddForm(false)
      qc.invalidateQueries({ queryKey: ['admin-airlines-list'] })
    },
    onError: () => {
      toast.error('Failed to create airline')
    },
  })

  const pending = applications.filter((a) => a.status === 'PENDING')
  const reviewed = applications.filter((a) => a.status !== 'PENDING')

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="section-title">Airline Management</h1>
        <p className="section-subtitle mt-1">Manage applications and active airlines</p>
      </div>

      {/* Create New Airline */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2 w-full justify-center py-2"
        >
          <Plus size={20} />
          Add New Airline Directly
        </button>
      ) : (
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4">Create New Airline</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Airline Name"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Callsign Prefix (e.g., FSK)"
                className="input uppercase"
                maxLength={5}
                value={formData.callsignPrefix}
                onChange={(e) =>
                  setFormData({ ...formData, callsignPrefix: e.target.value.toUpperCase() })
                }
              />
              <input
                type="text"
                placeholder="ICAO Code (e.g., FSK)"
                className="input uppercase"
                maxLength={4}
                value={formData.icaoCode}
                onChange={(e) =>
                  setFormData({ ...formData, icaoCode: e.target.value.toUpperCase() })
                }
              />
              <input
                type="text"
                placeholder="Hub ICAO (e.g., EGLL)"
                className="input uppercase"
                maxLength={4}
                value={formData.hub}
                onChange={(e) =>
                  setFormData({ ...formData, hub: e.target.value.toUpperCase() })
                }
              />
            </div>
            <input
              type="email"
              placeholder="Owner Email"
              className="input"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="input"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-slate-500">Logo file: PNG/JPG/WEBP, max 2MB.</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="input"
              onChange={(e) => setBannerLogoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-slate-500">Wide logo file (1800x400px): PNG/JPG/WEBP, max 2MB.</p>
            <input
              type="url"
              placeholder="Website (optional)"
              className="input"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
            <textarea
              placeholder="Description"
              className="input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createAirline()}
                disabled={isCreating || !formData.name || !formData.callsignPrefix || !formData.hub}
                className="btn-primary flex-1"
              >
                {isCreating ? 'Creating...' : 'Create Airline'}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Airline Applications */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Pending Applications ({pending.length})
        </h2>

        {appLoading ? (
          <div className="card animate-pulse h-24" />
        ) : pending.length === 0 ? (
          <div className="card text-center py-8 text-slate-500">No pending applications.</div>
        ) : (
          pending.map((app) => <ApplicationCard key={app.id} app={app} onReview={review} />)
        )}
      </div>

      {/* Reviewed Applications */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Previously Reviewed ({reviewed.length})</h2>
          {reviewed.map((app) => <ApplicationCard key={app.id} app={app} onReview={review} />)}
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app, onReview }: { app: Application; onReview: (v: { id: string; action: 'approve' | 'reject' }) => void }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            {app.logoUrl ? (
              <img src={app.logoUrl} alt={`${app.airlineName} logo`} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <span className="text-sky-500 font-bold text-xs font-mono">{app.callsignPrefix}</span>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{app.airlineName}</div>
            <div className="text-xs text-slate-500 font-mono">{app.callsignPrefix}{app.icaoCode ? ` · ${app.icaoCode}` : ''} · Hub: {app.hub}</div>
          </div>
        </div>
        <span className={`badge-status border ${statusColor[app.status]}`}>{app.status}</span>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{app.description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{app.contactEmail}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Users className="w-3.5 h-3.5" />
          ~{app.expectedPilots} pilots
        </div>
        {app.website && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Globe className="w-3.5 h-3.5" />
            <a href={app.website} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline truncate">{app.website.replace(/^https?:\/\//, '')}</a>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <RelativeTime value={app.submittedAt} />
        </div>
      </div>

      {app.status === 'PENDING' && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onReview({ id: app.id, action: 'approve' })} className="btn-primary py-1.5 px-4 text-sm">
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          <button onClick={() => onReview({ id: app.id, action: 'reject' })} className="btn-danger py-1.5 px-4 text-sm">
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      )}
    </div>
  )
}
