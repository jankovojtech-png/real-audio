import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/app/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title:       'Real Audio — Live Ambient Streams',
  description: 'Listen to real live ambient sound from open microphones around the world, live right now.',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'Real Audio',
  },
  openGraph: {
    title:       'Real Audio — Live Ambient Streams',
    description: 'Listen to real live ambient sound from open microphones around the world, live right now.',
    type:        'website',
    siteName:    'Real Audio',
  },
  twitter: {
    card:        'summary',
    title:       'Real Audio — Live Ambient Streams',
    description: 'Listen to real live ambient sound from open microphones around the world, live right now.',
  },
}

// viewport must be exported separately in Next.js 14+
export const viewport: Viewport = {
  themeColor:    '#080c10',
  width:         'device-width',
  initialScale:  1,
  minimumScale:  1,
  viewportFit:   'cover',   // enables env(safe-area-inset-*) on iOS standalone
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
