'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plane, CheckCircle, Building2, Globe, Users, Mail, MapPin, Hash } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerLogoFile, setBannerLogoFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    airlineName: '',
    callsignPrefix: '',
    icaoCode: '',
    website: '',
    description: '',
    contactName: '',
    contactEmail: '',
    hub: 'EGLL',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const body = new FormData()
    body.append('airlineName', form.airlineName)
    body.append('callsignPrefix', form.callsignPrefix)
    body.append('icaoCode', form.icaoCode)
    body.append('website', form.website)
    body.append('description', form.description)
    body.append('contactName', form.contactName)
    body.append('contactEmail', form.contactEmail)
    body.append('hub', form.hub)
    if (logoFile) body.append('logoFile', logoFile)
    if (bannerLogoFile) body.append('bannerLogoFile', bannerLogoFile)

    const res = await fetch('/api/airline/apply', {
      method: 'POST',
      body,
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setSubmitted(true)
    } else {
      const msg = typeof data.error === 'string' ? data.error : 'Please check your details and try again.'
      toast.error(msg)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Application Submitted!</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Thank you for applying to join the FlySky network. Our team will review your application and get back to you at <span className="text-sky-400">{form.contactEmail}</span> within 3–5 business days.
          </p>
          <Link href="/" className="btn-primary inline-flex">
            <Plane className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <nav className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-100 dark:bg-slate-900/50">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/flysky-logo-n.png" alt="FlySky Logo" width={32} height={32} className="object-contain" priority />
          <span className="text-lg font-bold text-slate-900 dark:text-white">FlySky</span>
        </Link>
        <Link href="/login" className="btn-secondary text-sm py-1.5 px-3">Sign In</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-sm font-medium">
            <Building2 className="w-4 h-4" />
            Airline Partnership Application
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Join the FlySky Network</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Apply to list your virtual airline on FlySky. Get access to our pilot management platform, PIREP system, live tracking, ranks, and Discord bot.
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Users, label: 'Pilot Management', desc: 'Full roster & rank system' },
            { icon: Globe, label: 'Live Tracking', desc: 'ACARS & map integration' },
            { icon: CheckCircle, label: 'PIREP System', desc: 'Automated scoring' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <Icon className="w-5 h-5 text-sky-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>
              <div className="text-xs text-slate-600 dark:text-slate-500">{desc}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">Airline Details</h2>

          <div className="space-y-4">
            <div>
              <label className="label"><Building2 className="w-3.5 h-3.5 inline mr-1" />Airline Name *</label>
              <input className="input" placeholder="e.g. Oceanic Virtual Airlines" value={form.airlineName} onChange={(e) => set('airlineName', e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label"><Hash className="w-3.5 h-3.5 inline mr-1" />Callsign Prefix *</label>
                <input className="input font-mono uppercase" placeholder="e.g. OVA" maxLength={5} value={form.callsignPrefix} onChange={(e) => set('callsignPrefix', e.target.value.toUpperCase())} required />
                <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">2–5 characters, letters only</p>
              </div>
              <div>
                <label className="label">ICAO Code</label>
                <input
                  className="input font-mono uppercase"
                  placeholder="e.g. OVA"
                  maxLength={4}
                  pattern="[A-Za-z]{2,4}"
                  title="Use 2-4 letters only"
                  value={form.icaoCode}
                  onChange={(e) => set('icaoCode', e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4))}
                />
              </div>
            </div>

            <div>
              <label className="label"><MapPin className="w-3.5 h-3.5 inline mr-1" />Main Hub *</label>
              <input
                className="input font-mono uppercase"
                placeholder="e.g. EGLL"
                maxLength={4}
                pattern="[A-Za-z]{4}"
                title="Use exactly 4 letters (ICAO code)"
                value={form.hub}
                onChange={(e) => set('hub', e.target.value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 4))}
                required
              />
            </div>

            <div>
              <label className="label">Square Logo File (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="input"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">Upload a square image (1:1), PNG/JPG/WEBP, max 2MB.</p>
            </div>

            <div>
              <label className="label">Wide Logo File (1800x400) (optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="input"
                  onChange={(e) => setBannerLogoFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">Upload a horizontal logo sized 1800x400px (PNG/JPG/WEBP, max 2MB).</p>
            </div>

            <div>
              <label className="label"><Globe className="w-3.5 h-3.5 inline mr-1" />Website</label>
              <input type="url" className="input" placeholder="https://your-airline.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Tell us about your airline — its history, fleet, routes, and what makes it unique..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                required
                minLength={20}
              />
              <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">{form.description.length}/1000 characters (min 20)</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 pt-2">Contact Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Your Name *</label>
              <input className="input" placeholder="Jane Smith" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} required />
            </div>
            <div>
              <label className="label"><Mail className="w-3.5 h-3.5 inline mr-1" />Email *</label>
              <input type="email" className="input" placeholder="you@airline.com" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>

          <p className="text-xs text-slate-600 dark:text-slate-500 text-center">
            By submitting, you agree that your airline complies with FlySky&apos;s community guidelines. Applications are reviewed within 3–5 business days.
          </p>
        </form>
      </div>
    </div>
  )
}
