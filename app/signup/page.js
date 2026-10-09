'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function age(dob) {
  const d = new Date(dob), n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}

export default function Signup() {
  const router = useRouter()
  const [type, setType] = useState('retail')
  const [f, setF] = useState({ full_name: '', email: '', password: '', phone: '', city: '', dob: '', business_name: '' })
  const [ok21, setOk21] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => { if (new URLSearchParams(window.location.search).get('type') === 'wholesale') setType('wholesale') }, [])

  async function go(e) {
    e.preventDefault()
    setErr('')
    if (!f.dob || age(f.dob) < 21) { setErr('You must be 21 or older to create an account.'); return }
    if (!ok21) { setErr('Please confirm you are 21 or older.'); return }
    if (f.password.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (type === 'wholesale' && !f.business_name.trim()) { setErr('Business name is required for wholesale.'); return }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { account_type: type, full_name: f.full_name, business_name: f.business_name, phone: f.phone, city: f.city, dob: f.dob } },
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    if (data.session) router.push('/account')
    else setDone('Account created. Check your email to confirm it, then log in.' + (type === 'wholesale' ? ' After logging in, upload your business license and resale certificate in My account so we can approve you.' : ''))
  }

  if (done) return <div className="card"><h2>Almost done</h2><p className="note">{done}</p><div className="row"><Link className="btn f" href="/login">Log in</Link></div></div>

  return (
    <form className="card" onSubmit={go}>
      <h2>{type === 'wholesale' ? 'Apply for wholesale' : 'Create retail account'}</h2>
      <div className="row" style={{ marginTop: 0 }}>
        <button type="button" className={'btn' + (type === 'retail' ? ' f' : '')} onClick={() => setType('retail')}>Retail</button>
        <button type="button" className={'btn' + (type === 'wholesale' ? ' f' : '')} onClick={() => setType('wholesale')}>Wholesale</button>
      </div>
      <p className="mute">{type === 'wholesale' ? 'Wholesale accounts are reviewed by our team. Prices appear after approval.' : 'Retail accounts are active right away.'}</p>
      <label htmlFor="n">Full name</label><input id="n" required value={f.full_name} onChange={set('full_name')} />
      {type === 'wholesale' && <><label htmlFor="b">Business name</label><input id="b" value={f.business_name} onChange={set('business_name')} /></>}
      <label htmlFor="ph">Phone</label><input id="ph" value={f.phone} onChange={set('phone')} />
      <label htmlFor="c">City</label><input id="c" value={f.city} onChange={set('city')} />
      <label htmlFor="d">Date of birth</label><input id="d" type="date" required value={f.dob} onChange={set('dob')} />
      <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set('email')} />
      <label htmlFor="p">Password (8+ characters)</label><input id="p" type="password" required value={f.password} onChange={set('password')} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={ok21} onChange={(e) => setOk21(e.target.checked)} /> I confirm I am 21 or older.</label>
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn f" disabled={busy}>{busy ? 'Please wait…' : type === 'wholesale' ? 'Submit application' : 'Create account'}</button><Link href="/login" className="mute">I already have an account</Link></div>
    </form>
  )
}
