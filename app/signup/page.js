'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { STATES } from '../../lib/states'

function age(dob) {
  const d = new Date(dob), n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}

export default function Signup() {
  const router = useRouter()
  const [type, setType] = useState('retail')
  const [f, setF] = useState({ full_name: '', email: '', password: '', phone: '', dob: '', business_name: '', state: '', tax_id: '' })
  const [permit, setPermit] = useState(null)
  const [ok21, setOk21] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const ws = type === 'wholesale'

  useEffect(() => { if (new URLSearchParams(window.location.search).get('type') === 'wholesale') setType('wholesale') }, [])

  async function go(e) {
    e.preventDefault()
    setErr('')
    if (!ws && (!f.dob || age(f.dob) < 21)) { setErr('You must be 21 or older to create an account.'); return }
    if (!ok21) { setErr('Please confirm you are 21 or older.'); return }
    if (f.password.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (ws && !f.business_name.trim()) { setErr('Store name is required.'); return }
    if (ws && !f.state) { setErr('Please choose the state your store is in.'); return }
    if (ws && !f.tax_id.trim()) { setErr('Tax ID number is required for wholesale.'); return }
    if (permit && (!permit.type.startsWith('image/') || permit.size > 5 * 1024 * 1024)) { setErr('The permit must be an image under 5 MB.'); return }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { account_type: type, full_name: f.full_name, business_name: f.business_name, phone: f.phone, dob: f.dob, state: f.state, tax_id: f.tax_id.trim() } },
    })
    if (error) { setBusy(false); setErr(error.message); return }
    let note = ''
    if (data.session && ws && permit) {
      const path = data.user.id + '/license-' + Date.now() + '-' + permit.name.replace(/[^a-z0-9.]/gi, '_')
      const up = await supabase.storage.from('wholesale-documents').upload(path, permit)
      if (!up.error) await supabase.rpc('set_my_documents', { p_license: path, p_resale: null })
      else note = ' Your permit photo could not be uploaded; you can add it later in My account.'
    } else if (!data.session && ws && permit) {
      note = ' After you confirm your email and log in, add your permit photo in My account.'
    }
    setBusy(false)
    if (data.session) router.push('/account')
    else setDone('Account created. Check your email to confirm it, then log in.' + (ws ? ' Our team will review your wholesale application.' : '') + note)
  }

  if (done) return <div className="card"><h2>Almost done</h2><p className="note">{done}</p><div className="row"><Link className="btn f" href="/login">Log in</Link></div></div>

  return (
    <form className="card" onSubmit={go}>
      <h2>{ws ? 'Apply for wholesale' : 'Create retail account'}</h2>
      <div className="row" style={{ marginTop: 0 }}>
        <button type="button" className={'btn' + (!ws ? ' f' : '')} onClick={() => setType('retail')}>Retail</button>
        <button type="button" className={'btn' + (ws ? ' f' : '')} onClick={() => setType('wholesale')}>Wholesale</button>
      </div>
      <p className="mute">{ws ? 'Wholesale accounts are reviewed by our team. Prices appear after approval.' : 'Retail accounts are active right away.'}</p>
      <label htmlFor="n">Your name</label><input id="n" required value={f.full_name} onChange={set('full_name')} />
      {ws && <>
        <label htmlFor="b">Store name</label><input id="b" value={f.business_name} onChange={set('business_name')} />
        <label htmlFor="s">State your store is in</label>
        <select id="s" value={f.state} onChange={set('state')}><option value="">Choose a state</option>{STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <label htmlFor="t">Tax ID number (required)</label><input id="t" value={f.tax_id} onChange={set('tax_id')} />
        <label htmlFor="pm">Photo of your permit (optional)</label><input id="pm" type="file" accept="image/*" onChange={(e) => setPermit(e.target.files[0] || null)} />
      </>}
      <label htmlFor="ph">Phone number</label><input id="ph" type="tel" required value={f.phone} onChange={set('phone')} />
      <label htmlFor="e">Email</label><input id="e" type="email" required value={f.email} onChange={set('email')} />
      {!ws && <><label htmlFor="d">Date of birth</label><input id="d" type="date" required value={f.dob} onChange={set('dob')} /></>}
      <label htmlFor="p">Password (8+ characters)</label><input id="p" type="password" required value={f.password} onChange={set('password')} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={ok21} onChange={(e) => setOk21(e.target.checked)} /> I confirm I am 21 or older.</label>
      {err && <p className="err">{err}</p>}
      <div className="row"><button className="btn f" disabled={busy}>{busy ? 'Please wait…' : ws ? 'Submit application' : 'Create account'}</button><Link href="/login" className="mute">I already have an account</Link></div>
    </form>
  )
}
