import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/dashboard/sidebar'
import { UserDropdown } from '@/components/dashboard/user-dropdown'
import { Menu } from 'lucide-react'
import Image from 'next/image'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const pilot = await prisma.pilot.findUnique({
    where: { userId: session.user.id },
    select: {
      airline: {
        select: {
          name: true,
          bannerLogoUrl: true,
        },
      },
    },
  })

  const activeAirline = pilot?.airline

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <Sidebar session={session} />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              {activeAirline?.bannerLogoUrl ? (
                <img
                  src={activeAirline.bannerLogoUrl}
                  alt={`${activeAirline.name} wide logo`}
                  className="h-12 w-auto max-w-[1200px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Image src="/flysky-logo-n.png" alt="FlySky Logo" width={28} height={28} className="object-contain" priority />
                  <div className="font-semibold text-slate-900 dark:text-white text-lg tracking-tight truncate">
                    FlySky
                  </div>
                </div>
              )}
            </div>

            <UserDropdown
              name={session.user.name ?? 'Pilot'}
              callsign={session.user.callsign ?? '—'}
              role={session.user.role}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
