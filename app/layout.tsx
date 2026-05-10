import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'CargoFi Marketplace',
  description: 'Invest in real-world freight assets. Earn yield from invoice factoring and fractional truck ownership — powered by Solana.',
  metadataBase: new URL('https://marketplace.cargofi.io'),
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png',  sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png',  sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'CargoFi Marketplace',
    description: 'Earn yield from real freight assets on Solana',
    url: 'https://marketplace.cargofi.io',
    siteName: 'CargoFi',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/icon-512x512.png' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Providers>
          <Navbar />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--border)',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-3)',
            fontSize: 13,
          }}>
            © {new Date().getFullYear()} CargoFi · Built on Solana ·{' '}
            <span style={{ color: '#d29922' }}>Devnet</span>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
