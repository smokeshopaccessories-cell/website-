'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Customers() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('wholesale')
  const [q, setQ] = useState('')
  const [to, setTo] = useState(null)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('profiles').select('*').eq('role', type).order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])) }, [type])
  const shown = rows.filter((r) => !q || (r.full_name + ' ' + r.business_name + ' ' + r.email + ' ' + r.phone).toLowerCase().includes(q.toLowerCase()))
  async function send() {
    if (!text.trim()) return
    const { error } = await supabase.from('messages').insert({ customer_id: to.id, sender: 'admin', body: text })
    setMsg(error ? error.message : 'Message sent to their account.'); if (!error) { setText(''); setTo(null) }
  }
  return (
    <>
      <div className="fm">
        <div><button className={'btn' + (type === 'wholesale' ? ' f' : '')} onClick={() => setType('wholesale')}>Wholesale</button> <button className={'btn' + (type === 'retail' ? ' f' : '')} onClick={() => setType('retail')}>Retail</button></div>
        <div style={{ flex: 3 }}><input placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(shown.map((r) => r.email).join(', ')); setMsg('Copied ' + shown.length + ' emails.') }}>Copy emails</button>
      </div>
      {msg && <p className="note">{msg}</p>}
      <div className="tw"><table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>City</th><th>Status</th><th>Since</th><th /></tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.id}><td><b>{r.business_name || r.full_name}</b>{r.business_name && <><br /><small>{r.full_name}</small></>}</td><td><a href={'mailto:' + r.email}>{r.email}</a></td><td>{r.phone && <a href={'tel:' + r.phone}>{r.phone}</a>}</td><td>{r.city}</td><td><span className={'tg ' + (r.status === 'approved' ? '' : 'w')}>{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><button className="btn" onClick={() => { setTo(r); setMsg('') }}>Message</button></td></tr>
        ))}</tbody></table></div>
      {to && (
        <div className="ov c" onClick={(e) => { if (e.target === e.currentTarget) setTo(null) }}>
          <div className="md"><h2>Message {to.business_name || to.full_name}</h2><textarea rows="4" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" /><div className="row"><button className="btn f" onClick={send}>Send</button><button className="btn" onClick={() => setTo(null)}>Cancel</button></div></div>
        </div>
      )}
    </>
  )
}
