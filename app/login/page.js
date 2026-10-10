'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [mfa, setMfa] = useState(null)
  const [code, setCode] = useState('')

  async function go(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) { setBusy(false); setErr(error.message); return }
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
      const f = await supabase.auth.mfa.listFactors()
      const factor = (f.data?.totp || []).find((x) => x.status === 'verified')
      setBusy(false)
      if (factor) { setMfa(factor.id); return }
    }
    setBusy(false)
    router.push('/')
  }
  async function verify(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const ch = await supabase.auth.mfa.challenge({ factorId: mfa })
    if (ch.error) { setBusy(false); setErr(ch.error.message); return }
    const v = await supabase.auth.mfa.verify({ factorId: mfa, challengeId: ch.data.id, code: code.trim() })
    setBusy(false)
    if (v.error) { setErr('That code did not work. Try the newest code from your app.'); return }
    router.push('/')
  }

  if (mfa) return (
    <form className="card" onSubmit={verify}>
      <h2>Two-step login</h2>
      <p>Open your authenticator app and enter the 6-digit code.</p>
      <label htmlFor="c">6-digit code</label><input id="c" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn f" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</button></div>
    </form>
  )

  return (
    <form className="card" onSubmit={go}>
      <h2>Log in</h2>
      <label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="p">Password</label><input id="p" type="password" required autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn f" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button><Link href="/signup" className="mute">Create an account</Link></div>
    </form>
  )
}
