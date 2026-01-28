import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AetherScan - Pollution & AQI Mapping',
  description: 'High-performance pollution and air quality index mapping system for India',
  keywords: ['AQI', 'pollution', 'air quality', 'India', 'mapping', 'environmental monitoring'],
  authors: [{ name: 'AetherScan' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
