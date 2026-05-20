'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Plane, LayoutDashboard, Map, FileText, BarChart3,
  Trophy, Users, Settings, LogOut, Shield, Calendar, Building2,
} from 'lucide-react'
import clsx from 'clsx'

import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/book', icon: Plane, label: 'Book a Flight' },
  { href: '/dashboard/tracking', icon: Map, label: 'Live Tracking' },
  { href: '/dashboard/pireps', icon: FileText, label: 'My PIREPs' },
  { href: '/dashboard/stats', icon: BarChart3, label: 'My Stats' },
  { href: '/dashboard/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/dashboard/events', icon: Calendar, label: 'Events' },
  { href: '/dashboard/airlines', icon: Building2, label: 'Airlines' },
]

const adminItems = [
  { href: '/admin', icon: Shield, label: 'Admin Panel' },
]

interface SidebarProps {
  session: {
    user: {
      name?: string | null
      email?: string | null
      role?: string
      callsign?: string
    }
  }
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 text-slate-700 dark:text-slate-100 shadow-sm dark:shadow-2xl dark:shadow-slate-950/20">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center justify-start gap-3">
          <Image src="/flysky-logo-n.png" alt="FlySky Logo" width={32} height={32} className="object-contain flex-shrink-0" priority />
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">FlySky</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sky-500/10 text-sky-600 dark:bg-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {session.user.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-1 px-3.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Admin</div>
            {adminItems.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sky-500/10 text-sky-600 dark:bg-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}

        {(session.user.role === 'AIRLINE_OWNER' || session.user.role === 'ADMIN') && (
          <>
            <div className="pt-4 pb-1 px-3.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Airline</div>
            <Link
              href="/airline/dashboard"
              className={clsx(
                'flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith('/airline')
                  ? 'bg-sky-500/10 text-sky-600 dark:bg-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              Airline Panel
            </Link>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <ThemeToggle />
        <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
