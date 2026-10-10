'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Security() {
  const [factor, setFactor] = useState(null)
  const [enroll, setEnroll] = useState(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactor((data?.totp || []).find((f) => f.status === 'verified') || null)
  }
  useEffect(() => { load() }, [])

  async function start() {
    setErr(''); setMsg('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Admin ' + Date.now() })
    if (error) { setErr(error.message); return }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }
  async function confirm() {
    setErr('')
    const ch = await supabase.auth.mfa.challenge({ factorId: enroll.id })
    if (ch.error) { setErr(ch.error.message); return }
    const v = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.data.id, code: code.trim() })
    if (v.error) { setErr('That code did not work. Check the 6 digits and try again.'); return }
    setEnroll(null); setCode(''); setMsg('Two-step login is now ON. From now on you will enter a 6-digit code every time you log in.'); load()
  }
  async function turnOff() {
    if (!confirm2()) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) setErr(error.message); else { setMsg('Two-step login turned off.'); load() }
  }
  const confirm2 = () => window.confirm('Turn off two-step login? Your admin account will be easier to break into.')

  return (
    <div className="cd">
      <h3>Two-step login for admin</h3>
      <p>Two-step login asks for a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator or Authy) in addition to your password. Even if someone learns your password, they can't use the admin area without your phone.</p>
      {factor && <p className="note"><b>ON.</b> Your admin account is protected with two-step login.</p>}
      {factor && <div className="row"><button className="btn d" onClick={turnOff}>Turn off two-step login</button></div>}
      {!factor && !enroll && <div className="row"><button className="btn f" onClick={start}>Turn on two-step login</button></div>}
      {enroll && (
        <div>
          <p><b>1.</b> Open your authenticator app and scan this code.</p>
          <img src={enroll.qr} alt="Scan with your authenticator app" style={{ width: 200, background: '#fff', border: '2px solid #0d0d0d' }} />
          <p><small>Can't scan? Enter this key by hand: <code>{enroll.secret}</code></small></p>
          <p><b>2.</b> Type the 6-digit code the app shows.</p>
          <div className="fm"><div style={{ maxWidth: 200 }}><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} aria-label="6-digit code" /></div><button className="btn f" onClick={confirm}>Confirm</button></div>
        </div>
      )}
      {msg && <p className="note">{msg}</p>}
      {err && <p className="err">{err}</p>}
      <p className="mute"><small>Tip: if you ever lose your phone, you can remove the authenticator in Supabase under Authentication, Users, then your account.</small></p>
    </div>
  )
}
