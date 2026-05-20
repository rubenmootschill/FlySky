'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Info, Settings, Radio, Award, Users,
  MapPin, Plane, Calendar, List, LogOut, Building2, KeyRound, BellRing,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV = [
  { href: '/airline/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/airline/info', icon: Info, label: 'Info' },
  { href: '/airline/general', icon: Settings, label: 'General' },
  { href: '/airline/discord-notifications', icon: BellRing, label: 'Discord Notifications' },
  { href: '/airline/feed', icon: Radio, label: 'Feed' },
  { href: '/airline/awards', icon: Award, label: 'Awards' },
  { href: '/airline/pilots', icon: Users, label: 'Pilots' },
  { href: '/airline/airports', icon: MapPin, label: 'Airports' },
  { href: '/airline/fleet', icon: Plane, label: 'Fleet' },
  { href: '/airline/schedules', icon: Calendar, label: 'Schedules' },
  { href: '/airline/flights', icon: List, label: 'Flights' },
  { href: '/airline/api-keys', icon: KeyRound, label: 'API Keys' },
  { href: '/airline/event', icon: Calendar, label: 'Events' },
  { href: '/airline/billing', icon: Building2, label: 'Billing' },
]

type AirlineOption = { id: string; name: string; callsignPrefix: string; hub: string }

type Props = {
  airline: AirlineOption
  airlines: AirlineOption[]
}

export default function AirlinePortalSidebar({ airline, airlines }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedAirlineId, setSelectedAirlineId] = useState(airline.id)

  useEffect(() => {
    setSelectedAirlineId(airline.id)
  }, [airline.id])

  const switchAirline = (airlineId: string) => {
    setSelectedAirlineId(airlineId)
    document.cookie = `activeAirlineId=${encodeURIComponent(airlineId)}; path=/; max-age=31536000; samesite=lax`
    router.push(pathname.startsWith('/airline') ? pathname : '/airline/dashboard')
    router.refresh()
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Image src="/flysky-logo-n.png" alt="FlySky Logo" width={40} height={40} className="object-contain flex-shrink-0" priority />
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{airline.name}</div>
            <div className="text-xs text-slate-500 font-mono">{airline.callsignPrefix} · {airline.hub}</div>
          </div>
        </div>

        {airlines.length > 1 && (
          <div className="mt-3">
            <label htmlFor="airline-switcher" className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Switch Airline
            </label>
            <select
              id="airline-switcher"
              value={selectedAirlineId}
              onChange={(event) => switchAirline(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {airlines.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.callsignPrefix})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'nav-link-active' : 'nav-link'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
        <Link href="/dashboard" className="nav-link text-xs">
          <LayoutDashboard className="w-4 h-4" />
          Pilot Dashboard
        </Link>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-link w-full text-left text-red-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
