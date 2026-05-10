import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import type { Idl } from '@coral-xyz/anchor'
import cfPoolIdl from '@/idl/cf_pool.json'
import cfAssetIdl from '@/idl/cf_asset.json'
import cfMarketIdl from '@/idl/cf_market.json'

export const NETWORK = 'devnet'
export const RPC = clusterApiUrl('devnet')
export const connection = new Connection(RPC, 'confirmed')

export const CF_POOL_PROGRAM_ID   = new PublicKey(process.env.NEXT_PUBLIC_CF_POOL_PROGRAM_ID!)
export const CF_ASSET_PROGRAM_ID  = new PublicKey(process.env.NEXT_PUBLIC_CF_ASSET_PROGRAM_ID!)
export const CF_MARKET_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_CF_MARKET_PROGRAM_ID ?? '6EFtF5g2Sg9ESkkcYTBedkFWK7KG7BWt4sbHjxaZnNsy')
export const CF_KYC_PROGRAM_ID    = new PublicKey(process.env.NEXT_PUBLIC_CF_KYC_PROGRAM_ID!)
export const USDC_MINT            = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!)
export const POOL_PDA             = new PublicKey(process.env.NEXT_PUBLIC_POOL_PDA!)

export function getPoolProgram(provider: AnchorProvider) {
  return new Program(cfPoolIdl as Idl, provider)
}

export function getAssetProgram(provider: AnchorProvider) {
  return new Program(cfAssetIdl as Idl, provider)
}

export function getMarketProgram(provider: AnchorProvider) {
  return new Program(cfMarketIdl as Idl, provider)
}

// Format USDC from raw u64 (6 decimals)
export function formatUsdc(raw: bigint | number, decimals = 2): string {
  const n = typeof raw === 'bigint' ? Number(raw) : raw
  return (n / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Shorten pubkey
export function shortPubkey(pk: string | PublicKey): string {
  const s = pk.toString()
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}
