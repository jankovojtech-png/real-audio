import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Real Audio — Ambient Streams',
  description: 'Live ambient audio streaming, stripped from public video streams.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
