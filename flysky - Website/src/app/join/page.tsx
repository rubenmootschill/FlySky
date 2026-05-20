'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plane, Mail, Lock, User, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JoinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    hub: '',
  })

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      toast.success('Welcome to FlySky! You can now sign in.')
      router.push('/login')
    } else {
      toast.error(data.error ?? 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Image src="/flysky-logo-n.png" alt="FlySky Logo" width={40} height={40} className="object-contain" priority />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">FlySky</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Join FlySky VA</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Create your pilot account</p>
        </div>

        <div className="card border-slate-700/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    className="input pl-10"
                    placeholder="John"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  className="input"
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="input pl-10"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Home Hub</label>
              <input
                type="text"
                maxLength={4}
                value={form.hub}
                onChange={(e) => set('hub', e.target.value.toUpperCase())}
                className="input"
                placeholder="e.g., EGLL"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="Repeat password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-sky-500/10 dark:bg-slate-800/50 border border-sky-500/20 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-sky-600 dark:text-slate-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                What happens next
              </div>
              <p>Your callsign (FSK001, FSK002...) will be assigned automatically.</p>
              <p>You&apos;ll start as a Student Pilot and progress by completing flights.</p>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plane className="w-4 h-4" />}
              {loading ? 'Creating account...' : 'Create Pilot Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-500">
              Already a member?{' '}
              <Link href="/login" className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
