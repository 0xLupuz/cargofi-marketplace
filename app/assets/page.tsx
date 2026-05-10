'use client'

import { useState, useEffect } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction } from '@solana/web3.js'
import { getAssociatedTokenAddress, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { supabase } from '@/lib/supabase'
import { connection, USDC_MINT, formatUsdc } from '@/lib/solana'
import Image from 'next/image'

const BRAND = '#3ab690'
const BRAND_BG = 'rgba(58,182,144,0.1)'
const BRAND_BORDER = 'rgba(58,182,144,0.25)'
const PURPLE = '#a78bfa'
const PURPLE_BG = 'rgba(167,139,250,0.1)'
const PURPLE_BORDER = 'rgba(167,139,250,0.25)'

// Oracle wallet acts as escrow for devnet testing
const ESCROW_WALLET = new PublicKey('xiTiq4VCNTwz8mMVVKP7MuvY5qDvC3FrC2TWMPzQpcF')
const ESCROW_USDC_ATA = new PublicKey('5gPFjdMN84FZ3poJRPk1VjVbcAPPkYU7NCCxQuvyycHH')

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  upcoming: { label: 'Coming Soon', color: '#d29922', bg: 'rgba(210,153,34,0.15)', border: 'rgba(210,153,34,0.3)' },
  listed:   { label: 'Live',        color: BRAND,     bg: BRAND_BG,                border: BRAND_BORDER           },
  sold_out: { label: 'Sold Out',    color: '#8b949e', bg: 'rgba(139,148,158,0.1)', border: 'rgba(139,148,158,0.25)' },
  retired:  { label: 'Retired',     color: '#484f58', bg: 'rgba(72,79,88,0.1)',    border: 'rgba(72,79,88,0.25)'   },
}

const HOW_IT_WORKS = [
  { n: '01', title: 'Buy Shares',    desc: 'Purchase fractional shares at listing price. Minimum 1 share ($6.50 USDC).' },
  { n: '02', title: '90-Day Lockup', desc: 'Shares lock for 90 days after purchase to ensure capital stability.' },
  { n: '03', title: 'Earn Revenue',  desc: 'Every load hauled generates revenue. Claim your proportional share each epoch.' },
  { n: '04', title: 'Trade Freely',  desc: 'After lockup, transfer shares to any KYC-approved wallet on Solana.' },
]

interface TruckAsset {
  id: string; name: string; make: string; model: string; year: number
  color: string; image_url: string; description: string
  total_shares: number; available_shares: number; price_per_share: number
  total_value_usd: number; est_apy_bps: number; lockup_days: number
  status: 'upcoming' | 'listed' | 'sold_out' | 'retired'
  route: string; operator: string; on_chain_mint?: string
}

function AssetCard({ asset, onPurchase }: { asset: TruckAsset; onPurchase: (updatedShares: number) => void }) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const [expanded, setExpanded] = useState(false)
  const [shares, setShares] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [usdcBal, setUsdcBal] = useState<number | null>(null)

  const soldPct = Math.round((1 - asset.available_shares / asset.total_shares) * 100)
  const apy = (asset.est_apy_bps / 100).toFixed(1)
  const s = STATUS_BADGE[asset.status] ?? STATUS_BADGE.upcoming
  const sharesNum = parseInt(shares) || 0
  const total = sharesNum * asset.price_per_share

  // Fetch USDC balance when wallet connects
  useEffect(() => {
    if (!publicKey || !connected) { setUsdcBal(null); return }
    getAssociatedTokenAddress(USDC_MINT, publicKey)
      .then(ata => getAccount(connection, ata))
      .then(acc => setUsdcBal(Number(acc.amount) / 1_000_000))
      .catch(() => setUsdcBal(0))
  }, [publicKey, connected])

  async function handleBuy() {
    if (!publicKey || !connected || sharesNum <= 0) return
    if (sharesNum > asset.available_shares) { setStatus({ type: 'error', msg: 'Insufficient available shares' }); return }
    if (total > (usdcBal ?? 0)) { setStatus({ type: 'error', msg: 'Insufficient USDC balance' }); return }

    setLoading(true); setStatus(null)
    try {
      const totalRaw = BigInt(Math.round(total * 1_000_000))
      const investorAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)

      const tx = new Transaction()

      // Ensure investor has USDC ATA
      try { await getAccount(connection, investorAta) } catch {
        tx.add(createAssociatedTokenAccountInstruction(publicKey, investorAta, publicKey, USDC_MINT))
      }

      // Transfer USDC to escrow
      tx.add(createTransferInstruction(investorAta, ESCROW_USDC_ATA, publicKey, totalRaw, [], TOKEN_PROGRAM_ID))

      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey

      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      // Record in Supabase
      await supabase.from('asset_purchases').insert({
        asset_id: asset.id,
        investor_wallet: publicKey.toBase58(),
        shares_bought: sharesNum,
        price_per_share: asset.price_per_share,
        total_usdc: total,
        tx_signature: sig,
        status: 'confirmed',
        locked_until: new Date(Date.now() + asset.lockup_days * 86400 * 1000).toISOString(),
      })

      // Decrement available shares
      await supabase.from('truck_assets')
        .update({ available_shares: asset.available_shares - sharesNum })
        .eq('id', asset.id)

      onPurchase(asset.available_shares - sharesNum)
      setShares('')
      setUsdcBal(prev => prev !== null ? prev - total : null)
      setStatus({ type: 'success', msg: `${sharesNum} shares purchased. TX: ${sig.slice(0,8)}…` })
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message?.slice(0, 120) ?? 'Transaction failed' })
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ overflow: 'hidden', cursor: 'pointer' }}
      onClick={() => { if (!loading) setExpanded(e => !e) }}>

      {/* Photo */}
      <div style={{ height: 180, background: '#0d1117', position: 'relative', borderBottom: '1px solid var(--border)' }}>
        {asset.image_url ? (
          <Image src={asset.image_url} alt={asset.name} fill
            style={{ objectFit: 'cover', objectPosition: 'center' }} sizes="400px" unoptimized />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#30363d', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No image</span>
          </div>
        )}
        <span style={{ position: 'absolute', top: 12, right: 12, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
          {s.label}
        </span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 16 }}>{asset.name}</div>
            <div style={{ fontSize: 12, color: '#484f58', marginTop: 2 }}>{asset.year} {asset.make} {asset.model}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: BRAND, fontSize: 16 }}>{apy}%</div>
            <div style={{ fontSize: 11, color: '#484f58' }}>est. APY</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[
            ['Price / Share',  `$${asset.price_per_share.toFixed(2)} USDC`],
            ['Total Shares',   asset.total_shares.toLocaleString()],
            ['Min Investment', `$${asset.price_per_share.toFixed(2)} USDC`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#8b949e' }}>{k}</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#484f58', marginBottom: 6 }}>
            <span>{asset.available_shares.toLocaleString()} available</span>
            <span>{soldPct}% sold</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${soldPct}%`, background: `linear-gradient(90deg, ${PURPLE}, #c4b5fd)`, borderRadius: 99 }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#484f58', marginBottom: 12 }}>{asset.lockup_days}-day lockup period</div>

        {/* Expanded buy panel */}
        {expanded && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6, marginBottom: 12 }}>{asset.description}</p>

            {asset.status !== 'listed' ? (
              <button disabled style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${PURPLE_BORDER}`, background: PURPLE_BG, color: PURPLE, fontSize: 13, fontWeight: 600, cursor: 'not-allowed' }}>
                {asset.status === 'upcoming' ? 'Available when listed' : 'Not available'}
              </button>
            ) : !connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 13, color: '#8b949e', textAlign: 'center', margin: 0 }}>Connect wallet to invest</p>
                <WalletMultiButton style={{ width: '100%', justifyContent: 'center' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {usdcBal !== null && (
                  <div style={{ fontSize: 12, color: '#484f58', textAlign: 'right' }}>
                    Balance: <span style={{ color: '#8b949e' }}>${usdcBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 6 }}>Shares to buy</label>
                  <input
                    type="number" min="1" max={asset.available_shares}
                    value={shares} onChange={e => { setShares(e.target.value); setStatus(null) }}
                    placeholder="0"
                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: '#f0f6fc', fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {sharesNum > 0 && (
                  <div style={{ background: BRAND_BG, border: `1px solid ${BRAND_BORDER}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#8b949e' }}>Total cost</span>
                      <span style={{ color: BRAND, fontWeight: 700, fontFamily: 'monospace' }}>${total.toFixed(2)} USDC</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#484f58' }}>Locked until</span>
                      <span style={{ color: '#484f58' }}>
                        {new Date(Date.now() + asset.lockup_days * 86400 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}

                {status && (
                  <div style={{
                    background: status.type === 'success' ? BRAND_BG : 'rgba(248,81,73,0.1)',
                    border: `1px solid ${status.type === 'success' ? BRAND_BORDER : 'rgba(248,81,73,0.3)'}`,
                    borderRadius: 8, padding: '10px 14px', fontSize: 12,
                    color: status.type === 'success' ? BRAND : '#f85149', lineHeight: 1.5,
                  }}>
                    {status.msg}
                    {status.type === 'success' && (
                      <div style={{ marginTop: 4 }}>
                        <a href={`/portfolio`} style={{ color: BRAND }}>View in portfolio →</a>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={loading || sharesNum <= 0 || sharesNum > asset.available_shares}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: `1px solid ${BRAND_BORDER}`, background: loading ? 'rgba(58,182,144,0.05)' : BRAND_BG, color: BRAND, fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.15s' }}
                >
                  {loading ? 'Confirming…' : `Buy ${sharesNum > 0 ? sharesNum.toLocaleString() : ''} Shares`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<TruckAsset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('truck_assets').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { setAssets(data ?? []); setLoading(false) })
  }, [])

  function handlePurchase(assetId: string, updatedShares: number) {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, available_shares: updatedShares } : a))
  }

  const listed = assets.filter(a => a.status === 'listed').length
  const totalValue = assets.reduce((s, a) => s + (a.total_value_usd ?? 0), 0)

  return (
    <div className="page-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="CargoFi" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f0f6fc' }}>Asset Marketplace</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#8b949e' }}>Fractional ownership of commercial trucks · Solana</p>
        </div>
      </div>

      <div style={{ background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 28, lineHeight: 1.7 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>⚖️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6fc', marginBottom: 4 }}>Regulatory Compliance — Coming Soon</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>
              Tokenized truck ownership is live on Solana devnet. Full public launch is pending applicable securities regulations (Reg D / Reg A+) and CFTC guidance on asset-backed tokens. CargoFi is actively working with legal counsel to bring this product to market. Share purchases in preview mode are recorded on-chain and in our registry.
            </div>
          </div>
        </div>
      </div>

      <div className="rg-3" style={{ marginBottom: 32 }}>
        {[
          { label: 'Live Listings',     value: listed.toString(),   color: PURPLE },
          { label: 'Total Asset Value', value: totalValue > 0 ? `$${(totalValue / 1000).toFixed(0)}K` : '$0', color: '#f0f6fc' },
          { label: 'Avg. APY',          value: '~12%',              color: BRAND  },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#8b949e', marginBottom: 16 }}>
        {assets.length > 0 ? `Trucks (${assets.length})` : 'Upcoming Listings'}
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#484f58', padding: 60, fontSize: 14 }}>Loading assets…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 40 }}>
          {assets.map(a => (
            <AssetCard key={a.id} asset={a} onPurchase={(shares) => handlePurchase(a.id, shares)} />
          ))}
          {Array.from({ length: Math.max(0, 2 - assets.length) }).map((_, n) => (
            <div key={n} style={{ border: '1px dashed var(--border-2)', borderRadius: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#30363d', fontWeight: 500 }}>Future listing</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: '32px 24px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f6fc', textAlign: 'center', marginBottom: 28, marginTop: 0 }}>
          How truck token ownership works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.title}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: PURPLE,
                background: PURPLE_BG, border: `1px solid ${PURPLE_BORDER}`,
                padding: '2px 8px', borderRadius: 6, marginBottom: 12,
              }}>{step.n}</div>
              <div style={{ fontWeight: 600, color: '#f0f6fc', fontSize: 14, marginBottom: 6 }}>{step.title}</div>
              <p style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
