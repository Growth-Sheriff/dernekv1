import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BADER - Dernek Yönetim Sistemi',
  description: 'Web-based dernek yönetim sistemi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
