const G = '#3ab690'

const PHASES = [
  {
    quarter: 'Q2 2026',
    label: 'NOW',
    labelColor: '#3ab690',
    labelBg: 'rgba(58,182,144,0.12)',
    borderColor: 'rgba(58,182,144,0.35)',
    title: 'Devnet MVP — Invoice Factoring on Solana',
    items: [
      '✅ Yield Pool — deposit USDC, earn yield from freight invoices',
      '✅ Invoice Marketplace — fund specific deals on-chain',
      '✅ Dispatch integration — one-click factoring request from load screen',
      '✅ Oracle service — automated deal lifecycle on Solana devnet',
      '⏳ Mainnet launch — post-hackathon audit + security review',
    ],
  },
  {
    quarter: 'Q3 2026',
    label: 'NEXT',
    labelColor: '#58a6ff',
    labelBg: 'rgba(88,166,255,0.1)',
    borderColor: 'rgba(88,166,255,0.2)',
    title: 'Mainnet + CargoFi Docs & Intel SaaS',
    items: [
      'Mainnet deployment — real USDC, real loads, real yield',
      'DOT + MC Number active — CargoFi LLC operating authority',
      'First OO fleet onboarded — 3–5 owner-operators, cross-border routes',
      'CargoFi Docs + Intel — AI-powered document capture & pre-cross validator',
      'KYC/KYB integration — compliant investor onboarding',
    ],
  },
  {
    quarter: 'Q4 2026',
    label: 'BUILDING',
    labelColor: '#a78bfa',
    labelBg: 'rgba(167,139,250,0.1)',
    borderColor: 'rgba(167,139,250,0.2)',
    title: 'CargoFi Finance — Real Capital Deployment',
    items: [
      'Invoice factoring with external capital — angel + family office round',
      'Truck Token sales — Reg D 506(c) for accredited investors',
      'Automated settlement — broker repayment triggers on-chain distribution',
      'Secondary market for invoice positions — liquidity for investors',
      'CargoFi México entity active — SOFOM partnership for MX operations',
    ],
  },
  {
    quarter: 'Q1 2027',
    label: 'ROADMAP',
    labelColor: '#f79c42',
    labelBg: 'rgba(247,156,66,0.1)',
    borderColor: 'rgba(247,156,66,0.2)',
    title: 'CargoFi Pay + Tokenization v2',
    items: [
      'CargoFi Pay — USDC rails for cross-border carrier settlements (USD → MXN)',
      'NFT title collateral — truck ownership represented on-chain (Solana)',
      'Retail investor access — Reg A+ filing, non-accredited participation',
      'CargoFi Holdings Delaware — holding entity for institutional capital',
      'Expand to air & ocean freight assets',
    ],
  },
  {
    quarter: '2027+',
    label: 'VISION',
    labelColor: '#8b949e',
    labelBg: 'rgba(139,148,158,0.08)',
    borderColor: 'rgba(139,148,158,0.15)',
    title: 'The Freight Finance Layer',
    items: [
      '50+ trucks tokenized, $10M+ TVL',
      'Marketplace liquidity — secondary trading of all CargoFi positions',
      'Cross-border expansion — USA, México, Colombia',
      'Institutional API — hedge funds and family offices access via SDK',
      'CargoFi Protocol — open infrastructure for freight-backed DeFi',
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 20px 100px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(58,182,144,0.1)', border: '1px solid rgba(58,182,144,0.25)',
          color: G, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '6px 14px', borderRadius: 999, marginBottom: 24,
        }}>
          Product Roadmap
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900,
          color: '#f0f6fc', letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 16px',
        }}>
          Building the{' '}
          <span style={{ color: G }}>freight finance layer</span>
        </h1>

        <p style={{ color: '#8b949e', fontSize: 16, lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
          CargoFi is a long-term infrastructure play. Here's the plan — from Solana devnet today to the global freight capital market.
        </p>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 19, top: 0, bottom: 0,
          width: 2, background: 'linear-gradient(to bottom, rgba(58,182,144,0.4), rgba(58,182,144,0.05))',
          borderRadius: 2,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {PHASES.map((phase, i) => (
            <div key={phase.quarter} style={{ display: 'flex', gap: 24 }}>

              {/* Dot */}
              <div style={{ position: 'relative', flexShrink: 0, width: 40, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', marginTop: 20,
                  background: i === 0 ? G : 'var(--bg-card)',
                  border: `2px solid ${i === 0 ? G : phase.labelColor}`,
                  boxShadow: i === 0 ? `0 0 0 4px rgba(58,182,144,0.15)` : 'none',
                  flexShrink: 0,
                }} />
              </div>

              {/* Card */}
              <div style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: `1px solid ${phase.borderColor}`,
                borderRadius: 12,
                padding: '24px 28px',
                marginBottom: 0,
              }}>
                {/* Quarter + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: '#f0f6fc',
                    fontFamily: 'monospace', letterSpacing: '0.05em',
                  }}>{phase.quarter}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: phase.labelColor,
                    background: phase.labelBg, border: `1px solid ${phase.labelColor}30`,
                    padding: '2px 8px', borderRadius: 999,
                  }}>{phase.label}</span>
                </div>

                {/* Title */}
                <div style={{
                  fontWeight: 700, color: '#f0f6fc', fontSize: 16,
                  letterSpacing: '-0.3px', marginBottom: 16,
                }}>{phase.title}</div>

                {/* Items */}
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {phase.items.map((item) => (
                    <li key={item} style={{
                      fontSize: 14, color: '#8b949e', lineHeight: 1.5,
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <span style={{ marginTop: 1, flexShrink: 0, opacity: 0.5 }}>—</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        marginTop: 64, padding: '32px', borderRadius: 12,
        background: 'rgba(58,182,144,0.06)', border: '1px solid rgba(58,182,144,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f6fc', marginBottom: 8 }}>
          We're building in public
        </div>
        <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
          CargoFi is live on Solana devnet. Every invoice funded today trains the underwriting model
          that will power millions in freight financing tomorrow.
        </p>
        <a
          href="https://marketplace.cargofi.io/pool"
          style={{
            display: 'inline-block', background: G, color: '#0d1117',
            fontWeight: 700, fontSize: 14, padding: '10px 24px',
            borderRadius: 8, textDecoration: 'none',
          }}
        >
          Start earning yield →
        </a>
      </div>

    </div>
  )
}
