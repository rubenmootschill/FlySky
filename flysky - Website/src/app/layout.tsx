import type { Metadata } from 'next'
import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: {
    default: 'FlySky | Virtual Airlines System',
    template: '%s | FlySky',
  },
  description: 'FlySky Virtual Airlines System – Your gateway to simulated aviation. Book flights, track hours, climb the ranks.',
  icons: {
    icon: '/flysky-logo.png',
    apple: '/flysky-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #334155',
              },
              success: { iconTheme: { primary: '#0ea5e9', secondary: '#f1f5f9' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
