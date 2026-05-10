'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { AnchorProvider } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { connection, USDC_MINT, POOL_PDA, getPoolProgram, formatUsdc, shortPubkey } from '@/lib/solana'
import Image from 'next/image'

const BRAND = '#3ab690'
const BRAND_BG = 'rgba(58,182,144,0.1)'
const BRAND_BORDER = 'rgba(58,182,144,0.25)'
const PURPLE = '#a78bfa'
const PURPLE_BG = 'rgba(167,139,250,0.1)'
const PURPLE_BORDER = 'rgba(167,139,250,0.25)'
const BLUE = '#58a6ff'
const BLUE_BG = 'rgba(88,166,255,0.1)'
const BLUE_BORDER = 'rgba(88,166,255,0.25)'

interface AssetHolding {
  id: string
  asset_id: string
  shares_bought: number
  price_per_share: number
  total_usdc: number
  tx_signature: string
  status: string
  locked_until: string
  created_at: string
  truck: {
    name: string
    make: string
    model: string
    year: number
    image_url: string
    route: string
    est_apy_bps: number
    total_shares: number
  } | null
}

interface InvoiceDeal {
  id: string
  invoice_id_hex: string
  gross_amount_usdc: number
  status: string
  created_at: string
  advance_amount_usdc: number | null
  settle_tx: string | null
}

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()

  const [holdings, setHoldings] = useState<AssetHolding[]>([])
  const [invoices, setInvoices] = useState<InvoiceDeal[]>([])
  const [poolShares, setPoolShares] = useState<bigint | null>(null)
  const [poolValue, setPoolValue] = useState<bigint | null>(null)
  const [usdcBal, setUsdcBal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!publicKey) return
    setLoading(true)
    const pk = publicKey.toBase58()

    // 1. Truck share holdings
    const { data: purchases } = await supabase
      .from('asset_purchases')
      .select('*, truck:truck_assets(name,make,model,year,image_url,route,est_apy_bps,total_shares)')
      .eq('investor_wallet', pk)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })

    setHoldings((purchases ?? []) as AssetHolding[])

    // 2. Invoice deals funded by this wallet
    const { data: deals } = await supabase
      .from('factoring_requests')
      .select('id,invoice_id_hex,gross_amount_usdc,status,created_at,advance_amount_usdc,settle_tx')
      .eq('investor_wallet', pk)
      .in('status', ['funded', 'broker_paid', 'settled'])
      .order('created_at', { ascending: false })

    setInvoices((deals ?? []) as InvoiceDeal[])

    // 3. Pool position (on-chain) — same seed as pool page: ['deposit', POOL_PDA, publicKey]
    try {
      const { PublicKey } = await import('@solana/web3.js')
      const { CF_POOL_PROGRAM_ID, POOL_PDA: POOL_PDA_KEY } = await import('@/lib/solana')
      const [recPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit'), POOL_PDA_KEY.toBuffer(), publicKey.toBuffer()],
        CF_POOL_PROGRAM_ID,
      )
      const [recInfo, poolInfo] = await Promise.all([
        connection.getAccountInfo(recPda, 'confirmed'),
        connection.getAccountInfo(POOL_PDA_KEY, 'confirmed'),
      ])
      if (recInfo && recInfo.data.length >= 104 && poolInfo) {
        const buf         = recInfo.data as Buffer
        const pbuf        = poolInfo.data as Buffer
        const sharesRaw   = buf.readBigUInt64LE(72)    // lower 64 bits of u128
        const totalSharesRaw = pbuf.readBigUInt64LE(160)  // lower 64 bits of u128
        const totalDeposits  = Number(pbuf.readBigUInt64LE(136))
        const totalInterest  = Number(pbuf.readBigUInt64LE(152))
        const totalAssetsRaw = totalDeposits + totalInterest
        if (sharesRaw > 0n && totalSharesRaw > 0n) {
          const valueRaw = sharesRaw * BigInt(totalAssetsRaw) / totalSharesRaw
          setPoolShares(sharesRaw)
          setPoolValue(valueRaw)
        }
      }
    } catch { /* no position */ }

    // 4. USDC balance
    try {
      const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const acc = await getAccount(connection, ata)
      setUsdcBal(Number(acc.amount) / 1_000_000)
    } catch { setUsdcBal(0) }

    setLoading(false)
  }, [publicKey, anchorWallet])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (!connected) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 13, fontWeight: 900, color: '#484f58', letterSpacing: '-0.5px' }}>PF</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f6fc', margin: '0 0 12px' }}>Your Portfolio</h1>
        <p style={{ fontSize: 14, color: '#8b949e', margin: '0 0 28px', lineHeight: 1.7 }}>
          Connect your Solana wallet to view your positions across the CargoFi pool, invoices, and truck tokens.
        </p>
        <WalletMultiButton />
      </div>
    )
  }

  const pk = publicKey!.toBase58()
  const totalTruckShares = holdings.reduce((s, h) => s + h.shares_bought, 0)
  const totalTruckUsdc   = holdings.reduce((s, h) => s + h.total_usdc, 0)

  return (
    <div className="page-wrap-sm">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#484f58', letterSpacing: '-0.5px' }}>PF</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f0f6fc' }}>Portfolio</h1>
            <div style={{ fontSize: 12, color: '#484f58', fontFamily: 'monospace', marginTop: 4 }}>{shortPubkey(pk)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {usdcBal !== null && (
            <span style={{ fontSize: 13, color: '#8b949e', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px' }}>
              ${usdcBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
            </span>
          )}
          <a href={`https://explorer.solana.com/address/${pk}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b949e', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', textDecoration: 'none' }}>
            Explorer
          </a>
        </div>
      </div>

      {/* Summary stats */}
      <div className="rg-3" style={{ marginBottom: 28 }}>
        {[
          { label: 'Pool Value',   value: poolValue !== null ? `$${formatUsdc(poolValue)}` : '$—', color: BRAND   },
          { label: 'Active Deals', value: invoices.length.toString(),                              color: BLUE     },
          { label: 'Truck Shares', value: totalTruckShares.toLocaleString(),                       color: PURPLE   },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Truck Holdings ── */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 15 }}>Truck Token Holdings</span>
          {totalTruckShares > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: PURPLE, background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`, borderRadius: 999, padding: '2px 10px' }}>
              {totalTruckShares.toLocaleString()} shares · ${totalTruckUsdc.toFixed(2)} invested
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#484f58', padding: 32 }}>Loading…</div>
        ) : holdings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ color: '#8b949e', fontSize: 14, margin: '0 0 6px' }}>No truck tokens held</p>
            <a href="/assets" style={{ color: PURPLE, textDecoration: 'none', fontSize: 13 }}>Browse asset listings →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {holdings.map(h => {
              const truck = h.truck
              const apy = truck ? (truck.est_apy_bps / 100).toFixed(1) : '—'
              const ownershipPct = truck ? ((h.shares_bought / truck.total_shares) * 100).toFixed(2) : '—'
              const lockDate = new Date(h.locked_until)
              const isLocked = lockDate > new Date()

              return (
                <div key={h.id} style={{ background: 'var(--bg-base)', border: `1px solid ${PURPLE_BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {/* Truck thumbnail */}
                    {truck?.image_url && (
                      <div style={{ width: 100, flexShrink: 0, position: 'relative', minHeight: 90 }}>
                        <Image src={truck.image_url} alt={truck.name ?? ''} fill
                          style={{ objectFit: 'cover' }} sizes="100px" unoptimized />
                      </div>
                    )}
                    <div style={{ flex: 1, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 14 }}>{truck?.name ?? 'Unknown Asset'}</div>
                        </div>
                        <span style={{ fontSize: 11, color: BRAND, background: BRAND_BG, border: `1px solid ${BRAND_BORDER}`, borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
                          {apy}% APY
                        </span>
                      </div>

                      <div className="rg-3" style={{ gap: 8 }}>
                        {[
                          ['Shares',       h.shares_bought.toLocaleString()],
                          ['Invested',     `$${h.total_usdc.toFixed(2)}`],
                          ['Ownership',    `${ownershipPct}%`],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div style={{ fontSize: 11, color: '#484f58', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc', fontFamily: 'monospace' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: isLocked ? '#d29922' : BRAND }}>
                          {isLocked ? `Locked until ${lockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Unlocked'}
                        </span>
                        {h.tx_signature && (
                          <a href={`https://explorer.solana.com/tx/${h.tx_signature}?cluster=devnet`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#58a6ff', textDecoration: 'none' }}>
                            TX: {h.tx_signature.slice(0, 8)}… ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pool Position ── */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 15 }}>Yield Pool Position</span>
        </div>
        {poolShares === null || poolShares === 0n ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ color: '#8b949e', fontSize: 14, margin: '0 0 6px' }}>No pool position yet</p>
            <a href="/pool" style={{ color: BRAND, textDecoration: 'none', fontSize: 13 }}>Deposit USDC to the yield pool →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: BRAND_BG, border: `1px solid ${BRAND_BORDER}`, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: BRAND, fontFamily: 'monospace' }}>
                {poolValue !== null ? `$${formatUsdc(poolValue)}` : '—'}
              </div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>USDC in yield pool</div>
            </div>
            <div style={{ background: 'var(--bg-base)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#8b949e' }}>Est. yield / invoice (3%)</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: BRAND }}>
                {poolValue !== null ? `+$${(Number(formatUsdc(poolValue)) * 0.03).toFixed(2)} USDC` : '—'}
              </span>
            </div>
            <a href="/pool" style={{ fontSize: 12, color: '#484f58', textDecoration: 'none', textAlign: 'center' }}>
              Manage position →
            </a>
          </div>
        )}
      </div>

      {/* ── Invoice Deals ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 15 }}>Invoice Deals</span>
        </div>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <p style={{ color: '#8b949e', fontSize: 14, margin: '0 0 6px' }}>No active invoice positions</p>
            <a href="/invoices" style={{ color: BLUE, textDecoration: 'none', fontSize: 13 }}>Browse open invoices →</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invoices.map(inv => (
              <div key={inv.id} style={{ background: 'var(--bg-base)', border: `1px solid ${BLUE_BORDER}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#8b949e' }}>#{inv.invoice_id_hex.slice(0, 8)}…</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f6fc', marginTop: 2 }}>${Number(inv.gross_amount_usdc).toFixed(2)}</div>
                </div>
                <span style={{ fontSize: 11, color: BLUE, background: BLUE_BG, border: `1px solid ${BLUE_BORDER}`, borderRadius: 999, padding: '3px 10px' }}>
                  {inv.status}
                </span>
                {inv.settle_tx && (
                  <a href={`https://explorer.solana.com/tx/${inv.settle_tx}?cluster=devnet`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: BLUE }}>TX ↗</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
