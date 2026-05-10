import Link from 'next/link'

const G = '#3ab690'

const PRODUCTS = [
  {
    href: '/pool',
    accent: '#3ab690',
    accentBg: 'rgba(58,182,144,0.08)',
    tag: 'Passive',
    title: 'Yield Pool',
    subtitle: '~10–14% APY',
    description: 'Deposit USDC into the CargoFi lending pool. Capital is deployed to fund freight invoices. Earn yield automatically as brokers repay.',
    cta: 'Deposit USDC',
  },
  {
    href: '/invoices',
    accent: '#58a6ff',
    accentBg: 'rgba(88,166,255,0.08)',
    tag: 'Active',
    title: 'Invoice Marketplace',
    subtitle: '2–4% per invoice',
    description: 'Browse real freight invoices awaiting funding. Fund specific deals and earn the spread when the broker pays.',
    cta: 'Browse Invoices',
  },
  {
    href: '/assets',
    accent: '#a78bfa',
    accentBg: 'rgba(167,139,250,0.08)',
    tag: 'Ownership',
    title: 'Truck Tokens',
    subtitle: 'Revenue shares',
    description: 'Buy tokenized shares of real commercial trucks. Earn proportional revenue from every load. Tradeable after 90-day lockup.',
    cta: 'Browse Assets',
  },
]

const STATS = [
  { label: 'Total Value Locked',  value: '$10,000',  sub: 'USDC · devnet' },
  { label: 'Invoices Funded',     value: '1',         sub: 'end-to-end verified' },
  { label: 'Pool APY',            value: '~12%',      sub: 'target yield' },
  { label: 'Assets Listed',       value: '0',         sub: 'listing soon' },
]

const STEPS = [
  { n: '01', title: 'Connect Wallet', desc: 'Link your Solana wallet (Phantom or Solflare). One KYC approval covers all CargoFi products.' },
  { n: '02', title: 'Fund Real Freight', desc: 'Your USDC goes directly to carriers waiting on broker payments. Every deal is backed by a real load.' },
  { n: '03', title: 'Earn & Withdraw', desc: 'When brokers pay, yield is settled on-chain instantly. Withdraw anytime or let it compound.' },
]

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>

      {/* Hero */}
      <section style={{ padding: '80px 0 60px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(58,182,144,0.1)', border: '1px solid rgba(58,182,144,0.25)',
          color: '#3ab690', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '6px 14px', borderRadius: 999, marginBottom: 28,
        }}>
          Powered by Solana
        </div>

        <h1 style={{ fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px', color: '#f0f6fc', letterSpacing: '-2px' }}>
          Invest in the{' '}
          <span style={{ color: G }}>freight economy</span>
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: '#8b949e', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Earn real yield from invoice factoring and fractional truck ownership.
          CargoFi connects freight operations to on-chain capital — fully transparent, on Solana.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pool" className="btn-primary">Start Earning</Link>
          <Link href="/assets" className="btn-secondary">Browse Truck Tokens</Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 64 }}>
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3ab690', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#484f58', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Products */}
      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#f0f6fc', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.5px' }}>
          Three ways to invest
        </h2>
        <p style={{ color: '#8b949e', textAlign: 'center', marginBottom: 32, fontSize: 15 }}>
          Choose your risk profile and investment style
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {PRODUCTS.map((p) => (
            <div key={p.href} className="product-card" style={{ borderColor: 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: p.accent,
                  background: p.accentBg, border: `1px solid ${p.accent}28`,
                  padding: '3px 10px', borderRadius: 999,
                }}>{p.tag}</span>
                <span style={{ fontSize: 12, color: p.accent }}>{p.subtitle}</span>
              </div>

              <div>
                <div style={{ fontWeight: 700, color: '#f0f6fc', fontSize: 17, letterSpacing: '-0.3px', marginBottom: 8 }}>{p.title}</div>
                <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {p.description}
                </p>
              </div>

              <Link href={p.href} style={{ color: p.accent, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                {p.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ marginBottom: 80 }}>
        <div className="card" style={{ padding: '40px 32px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f6fc', textAlign: 'center', marginBottom: 36 }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {STEPS.map((s) => (
              <div key={s.n}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#3ab690',
                  background: 'rgba(58,182,144,0.1)', border: '1px solid rgba(58,182,144,0.22)',
                  padding: '2px 8px', borderRadius: 6, marginBottom: 14,
                }}>{s.n}</div>
                <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 15, marginBottom: 8 }}>{s.title}</div>
                <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
