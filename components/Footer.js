'use client'
import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STORE } from '../lib/store'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [ok, setOk] = useState(false)
  const [msg, setMsg] = useState('')
  async function join(e) {
    e.preventDefault()
    if (!ok) { setMsg('Please tick the box to agree to the privacy policy.'); return }
    const { error } = await supabase.from('newsletter_signups').insert({ email: email.trim() })
    setMsg(error ? (error.code === '23505' ? 'You are already subscribed.' : 'Please enter a valid email.') : 'Thanks, you are subscribed!')
    if (!error) setEmail('')
  }
  return (
    <footer>
      <div className="ft">
        <div>
          <div className="lg"><img src="/logo.png" alt={STORE.name} /></div>
          {STORE.address && <p>{STORE.address}</p>}
          {STORE.phone && <p><a href={'tel:' + STORE.phone}>{STORE.phone}</a></p>}
          {STORE.email && <p><a href={'mailto:' + STORE.email}>{STORE.email}</a></p>}
          {STORE.hours && <p>{STORE.hours}</p>}
        </div>
        <div>
          <h3>Customer support</h3>
          <Link className="fl" href="/policy/privacy">Privacy Policy</Link>
          <Link className="fl" href="/policy/terms">Terms &amp; Conditions</Link>
          <Link className="fl" href="/policy/returns">Product Returns</Link>
          <Link className="fl" href="/policy/disclaimer">Disclaimer</Link>
          <Link className="fl" href="/signup?type=wholesale">Wholesale accounts</Link>
        </div>
        <div>
          <h3>Newsletter</h3>
          <p>Don't miss updates or promotions.</p>
          <form onSubmit={join}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" aria-label="Email" /><button>SEND</button></form>
          <label style={{ fontWeight: 400, fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={ok} onChange={(e) => setOk(e.target.checked)} /> I have read and agree to the privacy policy</label>
          {msg && <p>{msg}</p>}
          <div style={{ marginTop: 10 }}>
            {STORE.instagram && <a className="fl" href={STORE.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {STORE.facebook && <a className="fl" href={STORE.facebook} target="_blank" rel="noreferrer">Facebook</a>}
          </div>
        </div>
      </div>
      <div className="fb"><span>© {new Date().getFullYear()} {STORE.name}. All rights reserved. All trademarks and brand names belong to their respective owners.</span><span>{STORE.warning}</span></div>
      <div className="fb" style={{ borderTop: 0, paddingTop: 0 }}><span><strong>Disclaimer:</strong> {STORE.disclaimer} <Link href="/policy/disclaimer" style={{ textDecoration: 'underline' }}>Read the full disclaimer</Link></span></div>
    </footer>
  )
}
