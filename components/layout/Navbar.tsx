'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const NAV_LINKS = [
  { href: '/pool',      label: 'Yield Pool'  },
  { href: '/invoices',  label: 'Invoices'    },
  { href: '/assets',    label: 'Assets'      },
  { href: '/portfolio', label: 'Portfolio'   },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(13,17,23,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0 20px',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192x192.png" alt="CargoFi" style={{ height: 36, width: 36, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, color: '#f0f6fc', fontSize: 15 }}>
            <span style={{ color: '#3ab690' }}>Marketplace</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
          className="desktop-nav">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: active ? 'rgba(58,182,144,0.1)' : 'transparent',
                  color: active ? '#3ab690' : '#8b949e',
                  border: active ? '1px solid rgba(58,182,144,0.2)' : '1px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            display: 'none',
            alignItems: 'center', gap: 5, fontSize: 11,
            color: '#484f58', background: 'var(--bg-card)',
            padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)',
          }} className="devnet-badge">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d29922', display: 'inline-block' }} />
            Devnet
          </span>
          <WalletMultiButton />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex' }} className="mobile-nav">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '10px 0', fontSize: 11, fontWeight: 500,
                textDecoration: 'none', transition: 'color 0.15s',
                color: active ? '#3ab690' : '#484f58',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .desktop-nav { display: flex !important; }
          .devnet-badge { display: inline-flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </header>
  )
}
