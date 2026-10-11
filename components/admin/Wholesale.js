'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminMessage } from '../../lib/support'
import { DOC_TYPES } from '../../lib/docs'

export default function Wholesale() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [docs, setDocs] = useState({})
  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'wholesale').order('created_at', { ascending: false })
    setRows(data || [])
    const d = await supabase.from('wholesale_documents').select('*').order('id')
    const by = {}
    ;(d.data || []).forEach((x) => { (by[x.customer_id] = by[x.customer_id] || []).push(x) })
    setDocs(by)
  }
  useEffect(() => { load() }, [])
  async function setStatus(id, status) {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
    if (!error && status === 'approved') await adminMessage(id, 'account', 'Wholesale account', 'Good news! Your wholesale account is approved. You can now see your wholesale prices and send order requests.')
    setMsg(error ? error.message : 'Updated to ' + status + '.'); load()
  }
  async function setAdj(id, v) {
    const { error } = await supabase.from('profiles').update({ price_adjust_pct: Number(v) || 0 }).eq('id', id)
    setMsg(error ? error.message : 'Discount saved.')
  }
  async function view(path) {
    if (!path) return
    const { data, error } = await supabase.storage.from('wholesale-documents').createSignedUrl(path, 300)
    if (error) setMsg(error.message); else window.open(data.signedUrl, '_blank')
  }
  return (
    <>
      {msg && <p className="note">{msg}</p>}
      {rows.length === 0 && <p className="mute">No wholesale applications yet.</p>}
      {rows.map((r) => (
        <div className="cd" key={r.id}>
          <div className="ln"><b>{r.business_name || r.full_name} <span className={'tg ' + (r.status === 'approved' ? '' : r.status === 'rejected' ? 'b' : 'w')}>{r.status}</span></b><small>Applied {new Date(r.created_at).toLocaleDateString()}</small></div>
          <p className="mute">{r.full_name} · {r.email} · {r.phone || 'no phone'}</p>
          <p><b>State:</b> {r.state || '—'} · <b>Tax ID:</b> {r.tax_id || '—'}</p>
          <div className="row" style={{ marginTop: 0 }}>
            {(docs[r.id] || []).map((d, k) => <button key={d.id} className="btn" onClick={() => view(d.path)}>View {DOC_TYPES[d.doc_type] || 'document'} {k + 1}</button>)}
            {r.license_path && !(docs[r.id] || []).some((d) => d.path === r.license_path) && <button className="btn" onClick={() => view(r.license_path)}>View business license</button>}
            {r.resale_path && !(docs[r.id] || []).some((d) => d.path === r.resale_path) && <button className="btn" onClick={() => view(r.resale_path)}>View resale certificate</button>}
            {!(docs[r.id] || []).length && !r.license_path && !r.resale_path && <span className="mute">No pictures uploaded</span>}
          </div>
          <div className="row">
            {r.status !== 'approved' && <button className="btn f" onClick={() => setStatus(r.id, 'approved')}>Approve</button>}
            {r.status !== 'rejected' && <button className="btn d" onClick={() => setStatus(r.id, 'rejected')}>{r.status === 'approved' ? 'Revoke' : 'Reject'}</button>}
            <label style={{ margin: 0 }}>Extra discount % off wholesale <input style={{ width: 80 }} type="number" step="0.5" min="0" max="50" defaultValue={r.price_adjust_pct} onBlur={(e) => setAdj(r.id, e.target.value)} /></label>
          </div>
        </div>
      ))}
    </>
  )
}
