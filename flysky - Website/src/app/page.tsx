import Link from 'next/link'
import Image from 'next/image'
import { Plane, BarChart3, Map, Users, Star, Zap, Shield, Globe, ArrowRight, Compass, Radio, TrendingUp } from 'lucide-react'

const stats = [
  { icon: Plane, label: 'Flights Tracked', value: '2,635', change: 'today' },
  { icon: Users, label: 'Active Pilots', value: '518', change: 'now' },
  { icon: BarChart3, label: 'Total Hours', value: '1.2M+', change: 'logged' },
  { icon: Globe, label: 'Routes', value: '50+', change: 'available' },
]

const features = [
  {
    icon: Compass,
    title: 'Smart Flight Planning',
    description: 'Intuitive booking system with integrated SimBrief generation. Plan routes, load cargo, and file flight plans without leaving the platform.',
  },
  {
    icon: Radio,
    title: 'Live Airline Operations',
    description: 'Real-time flight tracking with detailed airport layouts. Watch your entire fleet operate across the globe simultaneously.',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Flight Analysis',
    description: 'Comprehensive PIREP scoring with vertical profiles, landing analysis, and performance metrics for continuous improvement.',
  },
  {
    icon: Star,
    title: 'Pilot Progression',
    description: 'Earn ranks and badges as you progress. Customize your profile and achieve milestones within your virtual airline.',
  },
  {
    icon: Zap,
    title: 'ACARS Integration',
    description: 'Automatic flight tracking via Pegasus ACARS. Connect MSFS, X-Plane, and Prepar3D with seamless integration.',
  },
  {
    icon: Shield,
    title: 'Airline Administration',
    description: 'Full control panel for managing PIREPs, fleet, routes, Discord integration, and pilot hierarchy.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="hidden dark:block">
                <Image
                  src="/FlySky-Logo-Wide-L.png"
                  alt="FlySky Logo"
                  width={160}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="block dark:hidden">
                <Image
                  src="/FlySky-Logo-Wide.png"
                  alt="FlySky Logo"
                  width={160}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
              <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
              <a href="#stats" className="hover:text-slate-200 transition-colors">Community</a>
              <Link href="/apply" className="hover:text-slate-200 transition-colors">For Airlines</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
                Sign In
              </Link>
              <Link href="/join" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-all">
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-600/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            
            <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 leading-tight">
              Experience Real <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Virtual Operations
              </span>
            </h1>
            
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              FlySky is a complete virtual airline management platform. Book realistic routes, track flights in real-time, analyze every flight, and build your aviation community from the ground up.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/join" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-lg transition-all flex items-center gap-2 group shadow-lg shadow-blue-500/20">
                Start Flying Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#features" className="text-slate-200 hover:text-white font-medium px-8 py-3 border border-slate-700 rounded-lg transition-colors">
                Learn More
              </Link>
            </div>
          </div>

          {/* Dashboard Preview Card */}
          <div className="mt-16 mx-auto max-w-4xl">
            <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800/30 border-b border-slate-700 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="relative w-full h-full">
                  <Image
                    src="/Booking-Dashboard.png"
                    alt="Booking Dashboard"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 px-4 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-800/60 group-hover:bg-slate-800 transition-colors mb-4 mx-auto">
                  <stat.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
                <div className="text-xs text-slate-500 mt-2">{stat.change}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Professional tools to manage, track, and grow your virtual airline community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="group p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/20 group-hover:from-blue-600/40 group-hover:to-cyan-600/40 flex items-center justify-center mb-4 transition-all">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why FlySky Section */}
      <section className="py-24 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                Built for Virtual<br />Aviation Communities
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Realistic Operations</h4>
                    <p className="text-slate-400">Professional flight planning and tracking tools that mirror real-world airline operations.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Easy Administration</h4>
                    <p className="text-slate-400">Comprehensive dashboard for managing pilots, aircraft, routes, and Discord integration.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Community Focused</h4>
                    <p className="text-slate-400">Build progression systems, pilot ranks, and community goals that keep pilots engaged.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Developer Friendly</h4>
                    <p className="text-slate-400">Open API, ACARS integration, and Discord webhooks for deep customization.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-0 aspect-square overflow-hidden relative">
              <div className="relative w-full h-full">
                <Image
                  src="/Tracker-L.png"
                  alt="Live tracker dashboard light mode"
                  fill
                  className="object-cover block dark:hidden"
                  priority
                />
                <Image
                  src="/Tracker-W.png"
                  alt="Live tracker dashboard dark mode"
                  fill
                  className="object-cover hidden dark:block"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-12 text-center backdrop-blur">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Take Off?</h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Join thousands of pilots in our community. Build your airline, fly realistic routes, and climb the ranks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link href="/join" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold px-8 py-3 rounded-lg transition-all inline-flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/apply" className="text-slate-300 hover:text-white font-medium px-8 py-3 border border-slate-700 rounded-lg transition-colors">
                Run an Airline
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/flysky-logo-n.png" alt="FlySky" width={28} height={28} className="rounded" />
                <span className="font-bold text-white">FlySky</span>
              </div>
              <p className="text-sm text-slate-500">Virtual airline management platform for serious communities.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition-colors">Features</a></li>
                <li><a href="/apply" className="hover:text-slate-200 transition-colors">For Airlines</a></li>
                <li><a href="#" className="hover:text-slate-200 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition-colors">Join</a></li>
                <li><a href="/login" className="hover:text-slate-200 transition-colors">Pilot Login</a></li>
                <li><a href="#" className="hover:text-slate-200 transition-colors">Discord</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-200 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-slate-200 transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} FlySky Virtual Airlines. All rights reserved.</span>
            <span>Virtual aviation community platform</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
