'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const [s, setS] = useState({ handling_fee: 0, free_over: '', pickup_enabled: true })
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('shipping_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => data && setS({ ...data, free_over: data.free_over ?? '' })) }, [])
  async function save() {
    const { error } = await supabase.from('shipping_settings').update({ handling_fee: Number(s.handling_fee) || 0, free_over: s.free_over === '' ? null : Number(s.free_over), pickup_enabled: !!s.pickup_enabled }).eq('id', 1)
    setMsg(error ? error.message : 'Saved.')
  }
  return (
    <div className="cd">
      <p className="mute">You enter the UPS total on each order yourself (Orders tab). The customer sees it in their account, and you contact them for payment.</p>
      <div className="fm">
        <div><label htmlFor="hf">Handling fee added to each order ($)</label><input id="hf" type="number" step="0.01" value={s.handling_fee} onChange={(e) => setS({ ...s, handling_fee: e.target.value })} /></div>
        <div><label htmlFor="fo">Free shipping over ($, optional)</label><input id="fo" type="number" step="0.01" value={s.free_over} onChange={(e) => setS({ ...s, free_over: e.target.value })} /></div>
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={!!s.pickup_enabled} onChange={(e) => setS({ ...s, pickup_enabled: e.target.checked })} /> Allow store pickup</label>
      <div className="row"><button className="btn f" onClick={save}>Save settings</button></div>
      {msg && <p className="note">{msg}</p>}
    </div>
  )
}
