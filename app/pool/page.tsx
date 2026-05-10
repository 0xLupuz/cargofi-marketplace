'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { connection, POOL_PDA, USDC_MINT, CF_POOL_PROGRAM_ID, getPoolProgram, shortPubkey } from '@/lib/solana'

const BRAND = '#3ab690'
const BRAND_BG = 'rgba(58,182,144,0.1)'
const BRAND_BORDER = 'rgba(58,182,144,0.25)'

// Vault PDA: ["vault", POOL_PDA]
const [VAULT_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), POOL_PDA.toBuffer()],
  CF_POOL_PROGRAM_ID,
)

/** Decode PoolState directly from raw account bytes (IDL has no field defs) */
function decodePoolState(data: Buffer) {
  // Layout: disc(8) + admin(32) + oracle(32) + usdcMint(32) + usdcVault(32) = 136
  // then: totalDeposits(8) + totalDeployed(8) + totalInterestEarned(8) = 24
  // then: unknown(16?) + feeBps(2) + advanceRateBps(2) + ...
  const totalDeposits      = Number(data.readBigUInt64LE(136)) / 1e6
  const totalDeployed      = Number(data.readBigUInt64LE(144)) / 1e6
  const totalInterestEarned = Number(data.readBigUInt64LE(152)) / 1e6
  const factoringFeeBps    = data.readUInt16LE(176)  // 300
  const advanceRateBps     = data.readUInt16LE(178)  // 9700
  return { totalDeposits, totalDeployed, totalInterestEarned, factoringFeeBps, advanceRateBps }
}

/** Decode LpDeposit deposit_record from raw bytes */
function decodeDepositRecord(data: Buffer) {
  // disc(8) + depositor(32) + pool(32) + ?(16) + depositedUsdc(8) + ?(8) + shares?(8) = 144
  const depositedUsdc = Number(data.readBigUInt64LE(88)) / 1e6
  const shares = Number(data.readBigUInt64LE(104))
  return { depositedUsdc, shares }
}

interface PoolStats { totalDeposits: number; totalDeployed: number; totalInterestEarned: number; factoringFeeBps: number; advanceRateBps: number }
interface MyPosition { depositedUsdc: number; usdcBalance: number }

export default function PoolPage() {
  const { connected, publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()

  const [pool, setPool]     = useState<PoolStats | null>(null)
  const [pos, setPos]       = useState<MyPosition | null>(null)
  const [tab, setTab]       = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // ── Pool stats: raw account decode, no wallet needed ─────────────────────
  const fetchPool = useCallback(async () => {
    setFetching(true)
    try {
      const info = await connection.getAccountInfo(POOL_PDA, 'confirmed')
      if (info) setPool(decodePoolState(info.data as Buffer))
    } catch (e: any) { console.error('fetchPool:', e.message) }
    finally { setFetching(false) }
  }, [])

  // ── My position: raw deposit_record decode ───────────────────────────────
  const fetchPosition = useCallback(async () => {
    if (!publicKey) return
    try {
      const [recPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit'), POOL_PDA.toBuffer(), publicKey.toBuffer()],
        CF_POOL_PROGRAM_ID,
      )
      const [info, ataInfo] = await Promise.all([
        connection.getAccountInfo(recPda, 'confirmed'),
        getAssociatedTokenAddress(USDC_MINT, publicKey)
          .then(ata => getAccount(connection, ata))
          .catch(() => null),
      ])
      setPos({
        depositedUsdc: info ? decodeDepositRecord(info.data as Buffer).depositedUsdc : 0,
        usdcBalance: ataInfo ? Number(ataInfo.amount) / 1e6 : 0,
      })
    } catch (e: any) { console.error('fetchPosition:', e.message) }
  }, [publicKey])

  useEffect(() => { fetchPool() }, [fetchPool])
  useEffect(() => { if (publicKey) fetchPosition() }, [publicKey, fetchPosition])

  // ── Deposit ───────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!anchorWallet || !publicKey || !amount) return
    setLoading(true); setStatus(null)
    try {
      const provider     = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program      = getPoolProgram(provider)
      const amountRaw    = new BN(Math.round(parseFloat(amount) * 1_000_000))
      const depositorAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const [recPda]     = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit'), POOL_PDA.toBuffer(), publicKey.toBuffer()], CF_POOL_PROGRAM_ID)

      const sig = await (program.methods as any)
        .deposit(amountRaw)
        .accounts({
          pool: POOL_PDA, usdcVault: VAULT_PDA, depositRecord: recPda,
          depositorUsdc: depositorAta, depositor: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
        }).rpc()

      setStatus({ type: 'success', msg: `Deposited ${amount} USDC · ${shortPubkey(sig)}` })
      setAmount('')
      setTimeout(() => { fetchPool(); fetchPosition() }, 4000)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message?.slice(0, 150) ?? 'Transaction failed' })
    } finally { setLoading(false) }
  }

  // ── Withdraw ──────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!anchorWallet || !publicKey || !amount) return
    setLoading(true); setStatus(null)
    try {
      const provider     = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program      = getPoolProgram(provider)
      const sharesRaw    = new BN(Math.round(parseFloat(amount) * 1_000_000))
      const depositorAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const [recPda]     = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit'), POOL_PDA.toBuffer(), publicKey.toBuffer()], CF_POOL_PROGRAM_ID)

      const sig = await (program.methods as any)
        .withdraw(sharesRaw)
        .accounts({
          pool: POOL_PDA, usdcVault: VAULT_PDA, depositRecord: recPda,
          depositorUsdc: depositorAta, owner: publicKey, depositor: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        }).rpc()

      setStatus({ type: 'success', msg: `Withdrew ${amount} USDC · ${shortPubkey(sig)}` })
      setAmount('')
      setTimeout(() => { fetchPool(); fetchPosition() }, 4000)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message?.slice(0, 150) ?? 'Transaction failed' })
    } finally { setLoading(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const tvl      = pool?.totalDeposits ?? null
  const interest = pool?.totalInterestEarned ?? null
  const apy      = pool ? ((pool.factoringFeeBps / 10000) * (365 / 14) * 100).toFixed(1) : null   // 14-day avg

  return (
    <div className="page-wrap-sm">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="CargoFi" style={{ width: 48, height: 48, objectFit: 'contain' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f0f6fc' }}>Yield Pool</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#8b949e' }}>Passive USDC yield from invoice factoring · devnet</p>
        </div>
      </div>

      {/* Stats */}
      <div className="rg-3" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Value Locked', value: tvl !== null ? `$${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : fetching ? '…' : '—', color: BRAND },
          { label: 'Est. APY (14-day)',  value: apy ? `~${apy}%` : fetching ? '…' : '—',                                   color: '#72d2b3' },
          { label: 'Interest Earned',    value: interest !== null ? `$${interest.toFixed(2)}` : fetching ? '…' : '—',       color: '#58a6ff' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#8b949e' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="layout-sidebar">

        {/* Deposit / Withdraw */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', background: '#0d1117', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {(['deposit', 'withdraw'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setAmount(''); setStatus(null) }} style={{
                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
                background: tab === t ? 'var(--bg-card-2)' : 'transparent',
                color: tab === t ? '#f0f6fc' : '#8b949e',
              }}>
                {t === 'deposit' ? 'Deposit' : 'Withdraw'}
              </button>
            ))}
          </div>

          {!connected ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ color: '#8b949e', fontSize: 14, marginBottom: 16 }}>Connect wallet to {tab}</p>
              <WalletMultiButton />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: '#8b949e', fontWeight: 500 }}>Amount (USDC)</label>
                {pos && (
                  <button onClick={() => setAmount(
                    tab === 'deposit'
                      ? pos.usdcBalance.toFixed(2)
                      : pos.depositedUsdc.toFixed(2)
                  )} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: BRAND }}>
                    Max: ${(tab === 'deposit' ? pos.usdcBalance : pos.depositedUsdc).toFixed(2)}
                  </button>
                )}
              </div>

              <input type="number" min="0" step="0.01" value={amount}
                onChange={e => { setAmount(e.target.value); setStatus(null) }}
                placeholder="0.00"
                style={{ width: '100%', background: '#0d1117', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 20, color: '#f0f6fc', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none', marginBottom: 16 }} />

              {tab === 'deposit' && parseFloat(amount) > 0 && pool && (
                <div style={{ background: BRAND_BG, border: `1px solid ${BRAND_BORDER}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#8b949e', lineHeight: 1.7 }}>
                  Depositing <strong style={{ color: '#f0f6fc' }}>${parseFloat(amount).toFixed(2)} USDC</strong><br/>
                  Pool yield: <strong style={{ color: BRAND }}>{(pool.factoringFeeBps / 100).toFixed(1)}% per invoice</strong> · ~{apy}% APY at 14-day avg<br/>
                  Withdraw anytime (no lockup on pool)
                </div>
              )}

              {status && (
                <div style={{ borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, lineHeight: 1.5,
                  background: status.type === 'success' ? BRAND_BG : 'rgba(248,81,73,0.1)',
                  border: `1px solid ${status.type === 'success' ? BRAND_BORDER : 'rgba(248,81,73,0.3)'}`,
                  color: status.type === 'success' ? BRAND : '#f85149' }}>
                  {status.msg}
                </div>
              )}

              <button onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={loading || !amount}
                style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 10,
                  cursor: loading || !amount ? 'not-allowed' : 'pointer',
                  fontSize: 15, fontWeight: 600,
                  background: loading || !amount ? 'var(--bg-card-2)' : 'linear-gradient(135deg, #3ab690, #1a9d75)',
                  color: loading || !amount ? '#484f58' : '#fff', transition: 'all 0.15s' }}>
                {loading ? 'Processing…' : tab === 'deposit' ? 'Deposit USDC' : 'Withdraw USDC'}
              </button>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* My Position */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Position</div>
            {!connected ? (
              <p style={{ color: '#484f58', fontSize: 13, margin: 0 }}>Connect wallet to view</p>
            ) : pos === null ? (
              <p style={{ color: '#484f58', fontSize: 13, margin: 0 }}>Loading…</p>
            ) : pos.depositedUsdc === 0 ? (
              <div>
                <p style={{ color: '#484f58', fontSize: 13, margin: '0 0 8px' }}>No deposit yet</p>
                <p style={{ color: '#484f58', fontSize: 11, margin: 0 }}>Wallet: ${pos.usdcBalance.toFixed(2)} USDC available</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: BRAND_BG, border: `1px solid ${BRAND_BORDER}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: BRAND }}>${pos.depositedUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>Deposited in pool</div>
                </div>
                {pool && (
                  <div style={{ fontSize: 12, color: '#484f58', lineHeight: 1.7 }}>
                    Earning <span style={{ color: BRAND }}>{(pool.factoringFeeBps / 100).toFixed(1)}% per invoice</span> funded from this pool
                    <br/>Est. yield on position: <span style={{ color: '#f0f6fc' }}>${(pos.depositedUsdc * pool.factoringFeeBps / 10000).toFixed(2)}/deal</span>
                  </div>
                )}
                {[
                  ['Wallet USDC', `$${pos.usdcBalance.toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#8b949e' }}>{k}</span>
                    <span style={{ color: '#f0f6fc', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 11, color: '#484f58', fontFamily: 'monospace' }}>
                  {shortPubkey(publicKey!.toBase58())}
                </div>
              </div>
            )}
          </div>

          {/* Pool Details */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pool Details</div>
              <button onClick={fetchPool} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', fontSize: 16 }}>↻</button>
            </div>
            {!pool ? (
              <p style={{ color: '#484f58', fontSize: 13, margin: 0 }}>{fetching ? 'Loading…' : '—'}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['TVL',           `$${pool.totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                  ['Deployed',      `$${pool.totalDeployed.toFixed(2)}`],
                  ['Interest Earned', `$${pool.totalInterestEarned.toFixed(2)}`],
                  ['Fee / Invoice', `${(pool.factoringFeeBps / 100).toFixed(1)}%`],
                  ['Advance Rate',  `${(pool.advanceRateBps / 100).toFixed(0)}%`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#484f58' }}>{k}</span>
                    <span style={{ color: '#8b949e', fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* APY Calculator */}
          {pool && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>APY by Broker Pay Speed</div>
              {[
                { days: 7,  label: '7 days (fast broker)' },
                { days: 14, label: '14 days (avg)' },
                { days: 30, label: '30 days (slow)' },
                { days: 45, label: '45 days (net-45)' },
              ].map(({ days, label }) => {
                const ratePerDeal = pool.factoringFeeBps / 10000
                const apy = ((Math.pow(1 + ratePerDeal, 365 / days) - 1) * 100).toFixed(1)
                return (
                  <div key={days} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#484f58' }}>{label}</span>
                    <span style={{ color: BRAND, fontWeight: 600 }}>{apy}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
