'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      window.location.href = '/'
    } else {
      setError('Invalid access code')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d1117', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 10 }}>
            <span style={{ color: '#f0f6fc' }}>Cargo</span>
            <span style={{ color: '#3ab690' }}>Fi</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#484f58' }}>Finance · devnet preview</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 14,
          padding: '28px 24px',
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: '#f0f6fc' }}>Enter access code</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#8b949e' }}>This preview is for authorized reviewers only.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="password"
              placeholder="Access code"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoFocus
              style={{
                background: '#0d1117', border: `1px solid ${error ? '#f85149' : '#30363d'}`,
                borderRadius: 8, padding: '12px 14px', fontSize: 15,
                color: '#f0f6fc', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />

            {error && (
              <p style={{ margin: 0, fontSize: 12, color: '#f85149' }}>⚠️ {error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                background: loading || !password ? '#21262d' : '#3ab690',
                color: loading || !password ? '#484f58' : '#fff',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: 15, fontWeight: 600, cursor: loading || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Verifying…' : 'Access'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#30363d' }}>
          CargoFi · Frontier Hackathon 2026
        </p>
      </div>
    </div>
  )
}
