'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Check } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import styles from './HomePageForm.module.css'

type Airline = {
  id: string
  name: string
  callsignPrefix: string
  icaoCode?: string
  logoUrl?: string
  bannerLogoUrl?: string
  hub: string
  website?: string
  description?: string
  ownerEmail?: string
  fleets: Array<{ id: string; count: number; fleetAircraftType: { icaoCode: string; name: string } }>
}

export default function AirlineInfoPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ name: '', website: '', description: '', shortName: '', icaoCode: '', homeIcao: '', homePageContent: '', homePageHtml: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerLogoFile, setBannerLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [bannerLogoPreviewUrl, setBannerLogoPreviewUrl] = useState<string | null>(null)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [closePassword, setClosePassword] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const bannerLogoInputRef = useRef<HTMLInputElement | null>(null)

  const { data: airline, isLoading } = useQuery({
    queryKey: ['airline-info'],
    queryFn: () => fetch('/api/airline/info').then((r) => r.json()),
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
      if (bannerLogoPreviewUrl) URL.revokeObjectURL(bannerLogoPreviewUrl)
    }
  }, [logoPreviewUrl, bannerLogoPreviewUrl])

  useEffect(() => {
    if (airline) {
      setFormData({
        name: airline.name,
        website: airline.website || '',
        description: airline.description || '',
        shortName: airline.shortName || '',
        icaoCode: airline.icaoCode || '',
        homeIcao: airline.homeIcao || '',
        homePageContent: airline.homePageContent || '',
        homePageHtml: airline.homePageHtml || '',
      })
    }
  }, [airline])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const body = new FormData()
      body.append('name', formData.name)
      body.append('website', formData.website)
      body.append('description', formData.description)
      body.append('shortName', formData.shortName)
      body.append('icaoCode', formData.icaoCode)
      body.append('homeIcao', formData.homeIcao)
      body.append('homePageContent', formData.homePageContent)
      body.append('homePageHtml', formData.homePageContent)
      if (logoFile) body.append('logoFile', logoFile)
      if (bannerLogoFile) body.append('bannerLogoFile', bannerLogoFile)

      const response = await fetch('/api/airline/info', {
        method: 'PATCH',
        body,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : 'Failed to update airline info'
        throw new Error(message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-info'] })
      setLogoFile(null)
      setBannerLogoFile(null)
      toast.success('Airline info updated')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update airline info'
      toast.error(message)
    },
  })

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Airline name is required')
      return
    }
    updateMutation.mutate()
  }

  const handleLogoFileChange = (file: File | null) => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    if (!file) {
      setLogoFile(null)
      setLogoPreviewUrl(null)
      return
    }
    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const handleBannerLogoFileChange = (file: File | null) => {
    if (bannerLogoPreviewUrl) URL.revokeObjectURL(bannerLogoPreviewUrl)
    if (!file) {
      setBannerLogoFile(null)
      setBannerLogoPreviewUrl(null)
      return
    }
    setBannerLogoFile(file)
    setBannerLogoPreviewUrl(URL.createObjectURL(file))
  }

  const closeAirlineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/airline/info', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: closePassword }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to close airline'
        throw new Error(message)
      }

      return data
    },
    onSuccess: () => {
      toast.success('Airline closed successfully')
      setIsCloseModalOpen(false)
      setClosePassword('')
      window.location.href = '/dashboard'
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to close airline'
      toast.error(message)
    },
  })

  const handleCloseAirline = () => {
    if (!closePassword.trim()) {
      toast.error('Password is required')
      return
    }
    closeAirlineMutation.mutate()
  }

  if (isLoading) return <div className="card animate-pulse h-48" />

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Airline Information</h1>
      </div>

      {/* Airline Profile Card */}
      <div className="card space-y-6">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleLogoFileChange(e.target.files?.[0] ?? null)}
        />
        <input
          ref={bannerLogoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleBannerLogoFileChange(e.target.files?.[0] ?? null)}
        />

        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="w-16 h-16 bg-sky-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-sky-400 transition"
            title="Click to upload square logo"
          >
            {logoPreviewUrl || airline?.logoUrl ? (
              <img src={logoPreviewUrl || airline?.logoUrl} alt={`${airline?.name || 'Airline'} logo`} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-sky-500 font-bold text-2xl font-mono">{airline?.callsignPrefix}</span>
            )}
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{airline?.name}</h2>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
              <span className="font-mono">{airline?.icaoCode || airline?.callsignPrefix}</span>
              <span>•</span>
              <span>Hub: {airline?.hub}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Click logo to upload square image (1:1).</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => bannerLogoInputRef.current?.click()}
          className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40 w-full text-left hover:ring-2 hover:ring-sky-400 transition"
          title="Click to upload wide logo"
        >
          {bannerLogoPreviewUrl || airline?.bannerLogoUrl ? (
            <img src={bannerLogoPreviewUrl || airline?.bannerLogoUrl} alt={`${airline?.name || 'Airline'} wide logo`} className="w-full max-w-[900px] h-auto object-contain" />
          ) : (
            <div className="w-full max-w-[900px] h-20 rounded border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm text-slate-500">
              Click to upload wide logo
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">Recommended size: 1800x400px (PNG/JPG/WEBP, max 2MB).</p>
        </button>

        {/* Info Fields */}
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Airline Name</label>
              <input
                type="text"
                maxLength={40}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field w-full"
                placeholder="Enter full airline name"
              />
              <p className="text-xs text-slate-500 mt-1">This is a full name of your new airline.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Short Name</label>
              <input
                type="text"
                maxLength={16}
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="input-field w-full"
                placeholder="Enter short name"
              />
              <p className="text-xs text-slate-500 mt-1">This name will be used when the full name is too long to fit.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Summary</label>
              <textarea
                maxLength={200}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field w-full"
                placeholder="A short sentence best describing your airline."
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-1">A short sentence best describing your airline.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Airline ICAO</label>
              <input
                type="text"
                maxLength={3}
                value={formData.icaoCode}
                onChange={(e) => setFormData({ ...formData, icaoCode: e.target.value })}
                className="input-field w-full"
                placeholder="Enter ICAO code"
              />
              <p className="text-xs text-slate-500 mt-1">ICAO code is your airline designator used for flight numbers.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Home ICAO</label>
              <input
                type="text"
                value={formData.homeIcao}
                onChange={(e) => setFormData({ ...formData, homeIcao: e.target.value })}
                className="input-field w-full"
                placeholder="Start typing airport name, city, or ICAO code"
              />
              <p className="text-xs text-slate-500 mt-1">Start typing airport name, city, or ICAO code (from airline network only).</p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary flex-1">
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
      </div>

      {/* Fleet Summary */}
      {airline?.fleets && airline.fleets.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-500" />
            Current Fleet
          </h2>
          <div className="space-y-2">
            {airline.fleets?.map((fleet: { id: string; count: number; fleetAircraftType: { icaoCode: string; name: string } }) => (
              <div key={fleet.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{fleet.fleetAircraftType.icaoCode}</div>
                  <div className="text-xs text-slate-500">{fleet.fleetAircraftType.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white">{fleet.count}</div>
                  <div className="text-xs text-slate-500">aircraft</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Home Page Description */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Home Page Description</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          This is what visitors of your airline will see on the home page.
        </p>

        <div className={styles.homePageForm}>
          <textarea
            placeholder="Write your home page description here..."
            rows={6}
            className={`${styles.inputField} ${styles.textArea}`}
            value={formData.homePageContent}
            onChange={(e) =>
              setFormData({
                ...formData,
                homePageContent: e.target.value,
                homePageHtml: e.target.value,
              })
            }
          />

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="btn-primary self-start"
          >
            <Check className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      {/* Close Airline */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-red-600">Close Airline</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Here you can close your airline for good. This action is irreversible.
        </p>
        <button
          className="btn-danger"
          onClick={() => {
            setIsCloseModalOpen(true)
            setClosePassword('')
          }}
        >
          Close Airline
        </button>
      </div>

      {isMounted &&
        isCloseModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Confirm Airline Closure</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Enter your password to verify this irreversible action.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={closePassword}
                  onChange={(e) => setClosePassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setIsCloseModalOpen(false)
                    setClosePassword('')
                  }}
                  disabled={closeAirlineMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  className="btn-danger flex-1"
                  onClick={handleCloseAirline}
                  disabled={closeAirlineMutation.isPending}
                >
                  {closeAirlineMutation.isPending ? 'Closing...' : 'Confirm Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
