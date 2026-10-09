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

  async function go(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) setErr(error.message)
    else router.push('/')
  }

  return (
    <form className="card" onSubmit={go}>
      <h2>Log in</h2>
      <label htmlFor="e">Email</label><input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="p">Password</label><input id="p" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn f" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button><Link href="/signup" className="mute">Create an account</Link></div>
    </form>
  )
}
