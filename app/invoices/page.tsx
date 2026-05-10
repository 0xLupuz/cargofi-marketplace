'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { AnchorProvider } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { connection, USDC_MINT, CF_MARKET_PROGRAM_ID, getMarketProgram } from '@/lib/solana'

const BRAND = '#3ab690'
const BRAND_BG = 'rgba(58,182,144,0.1)'
const BRAND_BORDER = 'rgba(58,182,144,0.25)'
const BLUE = '#58a6ff'
const BLUE_BG = 'rgba(88,166,255,0.1)'
const BLUE_BORDER = 'rgba(88,166,255,0.25)'

interface FactoringRequest {
  id: string; load_id: string | null
  gross_amount_usdc: number; advance_rate_bps: number
  fee_bps: number; investor_fee_bps: number; platform_fee_bps: number
  advance_amount_usdc: number | null; fee_amount_usdc: number | null
  investor_fee_usdc: number | null; platform_fee_usdc: number | null
  carrier_wallet: string | null; carrier_usdc_account: string | null
  status: string; created_at: string; invoice_id_hex: string
}

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:    { label: 'Pending Approval', color: '#484f58', bg: 'rgba(72,79,88,0.1)',    border: 'rgba(72,79,88,0.25)'   },
  approved:   { label: 'Approved',         color: '#d29922', bg: 'rgba(210,153,34,0.1)',  border: 'rgba(210,153,34,0.3)'  },
  listed:     { label: 'Open to Fund',    color: BLUE,      bg: BLUE_BG,                 border: BLUE_BORDER              },
  funded:     { label: 'Funded',          color: BRAND,     bg: BRAND_BG,                border: BRAND_BORDER             },
  broker_paid:{ label: 'Broker Paid',      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  settled:    { label: 'Settled',          color: '#3fb950', bg: 'rgba(63,185,80,0.1)',   border: 'rgba(63,185,80,0.25)'  },
  defaulted:  { label: 'Defaulted',        color: '#f85149', bg: 'rgba(248,81,73,0.1)',   border: 'rgba(248,81,73,0.3)'   },
  cancelled:  { label: 'Cancelled',        color: '#484f58', bg: 'rgba(72,79,88,0.1)',    border: 'rgba(72,79,88,0.25)'   },
}

function daysBetween(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) }

/** Convert invoice_id_hex → 32-byte Buffer (same logic as oracle) */
function invoiceHexToBytes(hex: string): Buffer {
  const clean = hex.replace(/-/g, '')
  const raw = Buffer.from(clean.slice(0, 32).padEnd(32, '0'), 'hex')
  const out = Buffer.alloc(32, 0)
  raw.copy(out)
  return out
}

function FundButton({ invoice, onFunded }: { invoice: FactoringRequest; onFunded: () => void }) {
  const { publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleFund() {
    if (!publicKey || !anchorWallet) return
    if (!invoice.carrier_usdc_account) { setErr('No carrier USDC account on record'); return }
    setLoading(true); setErr('')

    try {
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program = getMarketProgram(provider)

      const idBytes = invoiceHexToBytes(invoice.invoice_id_hex)
      const [dealPda] = PublicKey.findProgramAddressSync([Buffer.from('deal'), idBytes], CF_MARKET_PROGRAM_ID)
      const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from('deal_vault'), idBytes], CF_MARKET_PROGRAM_ID)
      const investorUsdc = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const carrierUsdc = new PublicKey(invoice.carrier_usdc_account)

      const sig = await (program.methods as any)
        .fundDeal([...idBytes])
        .accounts({
          deal:          dealPda,
          dealVault:     vaultPda,
          investorUsdc,
          carrierUsdc,
          usdcMint:      USDC_MINT,
          investor:      publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram:  TOKEN_PROGRAM_ID,
          rent:          SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      // Update status + record investor wallet in Supabase
      await supabase.from('factoring_requests').update({
        status: 'funded',
        investor_wallet: publicKey.toBase58(),
      }).eq('id', invoice.id)

      console.log('fund_deal TX:', sig)
      onFunded()
    } catch (e: any) {
      setErr(e?.message?.slice(0, 120) ?? 'Transaction failed')
    }
    setLoading(false)
  }

  const gross       = Number(invoice.gross_amount_usdc)
  const advance     = gross * (invoice.advance_rate_bps / 10000)
  const investorFee = gross * ((invoice.investor_fee_bps ?? 200) / 10000)
  const platformFee = gross * ((invoice.platform_fee_bps ?? 100) / 10000)

  return (
    <div>
      <div style={{ background: BLUE_BG, border: `1px solid ${BLUE_BORDER}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e' }}>You send (advance)</span>
          <span style={{ color: BLUE, fontFamily: 'monospace', fontWeight: 600 }}>${advance.toFixed(2)} USDC</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e' }}>Your yield (2%)</span>
          <span style={{ color: BRAND, fontFamily: 'monospace', fontWeight: 600 }}>+${investorFee.toFixed(2)} USDC</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid rgba(88,166,255,0.15)' }}>
          <span style={{ color: '#484f58' }}>CargoFi fee (1%)</span>
          <span style={{ color: '#484f58', fontFamily: 'monospace' }}>${platformFee.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b949e', fontWeight: 600 }}>You receive back</span>
          <span style={{ color: '#f0f6fc', fontFamily: 'monospace', fontWeight: 700 }}>${(advance + investorFee).toFixed(2)} USDC</span>
        </div>
      </div>
      {err && <div style={{ fontSize: 11, color: '#f85149', marginBottom: 6, lineHeight: 1.4 }}>{err}</div>}
      <button
        onClick={handleFund}
        disabled={loading}
        style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${BLUE_BORDER}`, background: loading ? BLUE_BG : BLUE, color: loading ? BLUE : '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? 'Confirming…' : 'Fund Deal'}
      </button>
    </div>
  )
}

export default function InvoicesPage() {
  const { connected, publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()
  const [invoices, setInvoices] = useState<FactoringRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchInvoices = useCallback(() => {
    setLoading(true)
    supabase.from('factoring_requests').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setInvoices(data || []); setLoading(false) })
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const open    = invoices.filter(i => i.status === 'listed')
  const funded  = invoices.filter(i => i.status === 'funded')
  const settled = invoices.filter(i => i.status === 'settled')
  const totalOpen = open.reduce((a, b) => a + Number(b.gross_amount_usdc), 0)
  const totalYield = open.reduce((a, b) => a + Number(b.gross_amount_usdc) * ((b.investor_fee_bps ?? 200) / 10000), 0)

  const FILTERS = ['all', 'listed', 'funded', 'settled', 'pending', 'approved']

  return (
    <div className="page-wrap">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="CargoFi" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f0f6fc' }}>Invoice Marketplace</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#8b949e' }}>Fund freight invoices — earn 2–4% per deal in 30–45 days</p>
        </div>
      </div>

      {/* Stats */}
      <div className="rg-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Open to Fund',  value: open.length,    color: BLUE   },
          { label: 'Open Volume',   value: `$${totalOpen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#f0f6fc' },
          { label: 'Investor Yield (2%)', value: `$${totalYield.toFixed(2)}`, color: BRAND  },
          { label: 'Settled',       value: settled.length, color: '#3fb950' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
            background: filter === f ? 'var(--bg-card-2)' : 'transparent',
            color: filter === f ? '#f0f6fc' : '#8b949e',
            borderColor: filter === f ? 'var(--border)' : 'transparent',
          }}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#484f58' }}>Loading invoices…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p style={{ color: '#8b949e', fontSize: 14, margin: 0 }}>No invoices in this category</p>
          <p style={{ color: '#484f58', fontSize: 12, marginTop: 8 }}>Factoring requests come from CargoFi Dispatch when carriers submit loads</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(inv => {
            const s = STATUS[inv.status] ?? STATUS.pending
            const isExpanded = expandedId === inv.id
            const gross       = Number(inv.gross_amount_usdc)
            const advance     = inv.advance_amount_usdc ?? gross * (inv.advance_rate_bps / 10000)
            const fee         = inv.fee_amount_usdc ?? gross * ((inv.fee_bps ?? 300) / 10000)
            const investorYield = inv.investor_fee_usdc ?? gross * ((inv.investor_fee_bps ?? 200) / 10000)
            const platformFee   = inv.platform_fee_usdc ?? gross * ((inv.platform_fee_bps ?? 100) / 10000)

            return (
              <div key={inv.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="inv-row"
                >
                  <div className="inv-col-id">
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b949e' }}>#{inv.invoice_id_hex.slice(0, 8)}…</div>
                    {inv.load_id && <div style={{ fontSize: 11, color: '#484f58', marginTop: 2 }}>Load: {inv.load_id.slice(0, 8)}</div>}
                  </div>
                  <div className="inv-col-amount" style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f6fc', fontSize: 15 }}>${gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 10, color: '#484f58' }}>gross</div>
                  </div>
                  <div className="inv-col-advance hide-mobile" style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', color: BLUE, fontSize: 14 }}>${advance.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#484f58' }}>{(inv.advance_rate_bps / 100).toFixed(0)}% advance</div>
                  </div>
                  <div className="inv-col-yield hide-mobile" style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', color: BRAND, fontSize: 14 }}>+${investorYield.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#484f58' }}>your yield (2%)</div>
                  </div>
                  <div className="inv-col-status" style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="inv-col-toggle" style={{ textAlign: 'right', fontSize: 12, color: '#484f58', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span className="hide-mobile">{daysBetween(inv.created_at)}d</span>
                    <span style={{ fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-base)' }}>
                    <div className={inv.status === 'listed' && connected ? 'layout-detail' : ''}>
                      {/* Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Pipeline */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>PIPELINE</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 11 }}>
                            {(['listed','funded','broker_paid','settled'] as const).map((st, i, arr) => {
                              const order = ['listed','funded','broker_paid','settled','defaulted']
                              const done   = order.indexOf(inv.status) > order.indexOf(st)
                              const active = inv.status === st
                              return (
                                <span key={st} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: done ? BRAND : active ? '#f0f6fc' : '#484f58', fontWeight: active ? 700 : 400 }}>
                                    {done ? '✓' : active ? '●' : '○'} {st === 'listed' ? 'Listed' : st === 'funded' ? 'Funded' : st === 'broker_paid' ? 'Broker Paid' : 'Settled'}
                                  </span>
                                  {i < arr.length - 1 && <span style={{ color: '#30363d' }}>→</span>}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        {/* Financials */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>FINANCIAL BREAKDOWN</div>
                          {[
                            ['Gross (broker owes)',  `$${gross.toFixed(2)}`,                  '#f0f6fc'],
                            ['Advance to carrier',   `$${advance.toFixed(2)}`,                '#58a6ff'],
                            ['Your yield (2%)',       `+$${investorYield.toFixed(2)}`,         BRAND   ],
                            ['CargoFi fee (1%)',      `$${platformFee.toFixed(2)}`,             '#484f58'],
                            ['You receive back',      `$${(advance + investorYield).toFixed(2)}`, BRAND ],
                          ].map(([k, v, c]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                              <span style={{ color: '#8b949e' }}>{k}</span>
                              <span style={{ color: c as string, fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {/* APY */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>APY IF BROKER PAYS IN…</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[7, 14, 30, 45].map(days => {
                              const rate = investorYield / advance
                              const apy  = ((Math.pow(1 + rate, 365 / days) - 1) * 100).toFixed(0)
                              return (
                                <div key={days} style={{ flex: 1, background: 'var(--bg-base)', borderRadius: 6, padding: '8px 0', textAlign: 'center' }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: BRAND }}>{apy}%</div>
                                  <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{days}d</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {/* Timeline */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, color: '#484f58', marginBottom: 8 }}>TIMELINE</div>
                          {[
                            ['Created', new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
                            ['Est. broker payment', `${new Date(new Date(inv.created_at).getTime() + 7*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(new Date(inv.created_at).getTime() + 14*86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`],
                            ['Invoice ID', `${inv.invoice_id_hex.slice(0,12)}…`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                              <span style={{ color: '#8b949e' }}>{k}</span>
                              <span style={{ color: k === 'Est. broker payment' ? '#d29922' : '#f0f6fc', fontFamily: k === 'Invoice ID' ? 'monospace' : 'inherit' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fund panel (only for listed) */}
                      {inv.status === 'listed' && (
                        <div>
                          {!connected ? (
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12 }}>Connect wallet to fund this invoice</p>
                              <WalletMultiButton />
                            </div>
                          ) : (
                            <FundButton invoice={inv} onFunded={() => { fetchInvoices(); setExpandedId(null) }} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
