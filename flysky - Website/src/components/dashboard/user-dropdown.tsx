'use client'
import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Settings, User, Building2, LogOut } from 'lucide-react'

interface UserDropdownProps {
  name: string
  callsign: string
  rank?: string
  role?: string
}

export function UserDropdown({ name, callsign, rank, role }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isAirlineOwner = role === 'AIRLINE_OWNER' || role === 'ADMIN'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-right"
      >
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
            {name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {callsign}{rank ? ` · ${rank}` : ''}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{callsign}{rank ? ` · ${rank}` : ''}</div>
          </div>

          <div className="py-1">
            {isAirlineOwner && (
              <button
                type="button"
                onClick={() => { setOpen(false); router.push('/airline/dashboard') }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                My Airline Settings
              </button>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); router.push('/dashboard/settings') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <User className="w-4 h-4 text-slate-400" />
              My FlySky Account
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); router.push('/dashboard/airlines') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Select Airline
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 py-1">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
