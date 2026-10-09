'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money } from '../../lib/cart'

const ST = ['new', 'contacted', 'paid', 'shipped', 'completed']

function Order({ o, reload }) {
  const [status, setStatus] = useState(o.status)
  const [ups, setUps] = useState(o.ups_total ?? '')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const sub = o.order_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  async function save() {
    const { error } = await supabase.from('orders').update({ status, ups_total: ups === '' ? null : Number(ups) }).eq('id', o.id)
    setMsg(error ? error.message : 'Saved.'); if (!error) reload()
  }
  async function send() {
    if (!text.trim()) return
    const { error } = await supabase.from('messages').insert({ customer_id: o.customer_id, sender: 'admin', body: text, order_id: o.id })
    setMsg(error ? error.message : 'Message sent to the customer portal.'); if (!error) setText('')
  }
  const c = o.profiles || {}
  return (
    <div className="cd">
      <div className="ln"><b>Order #{o.id} · {c.business_name || c.full_name}</b><small>{new Date(o.created_at).toLocaleString()}</small></div>
      <p className="mute">{c.full_name} · {c.email} · {c.phone || ''} · {o.delivery === 'ups' ? 'UPS: ' + (o.address || '') : 'Store pickup'}</p>
      {o.order_items.map((i, k) => <div className="ln" key={k}><span>{i.qty} × #{i.products?.item_number} {i.products?.name}</span><span>{money(i.qty * i.unit_price)}</span></div>)}
      <div className="ln"><b>Items total</b><b>{money(sub)}</b></div>
      <div className="fm" style={{ marginTop: 10 }}>
        <div><label htmlFor={'u' + o.id}>UPS shipping total ($)</label><input id={'u' + o.id} type="number" step="0.01" value={ups} onChange={(e) => setUps(e.target.value)} /></div>
        <div><label htmlFor={'s' + o.id}>Status</label><select id={'s' + o.id} value={status} onChange={(e) => setStatus(e.target.value)}>{ST.map((s) => <option key={s}>{s}</option>)}</select></div>
        <button className="btn f" onClick={save}>Save order</button>
      </div>
      <div className="fm" style={{ marginTop: 10 }}><div style={{ flex: 3 }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message to customer (shows in their account)" aria-label="Message" /></div><button className="btn" onClick={send}>Send message</button></div>
      {msg && <p className="note">{msg}</p>}
    </div>
  )
}

export default function Orders() {
  const [rows, setRows] = useState([])
  const [f, setF] = useState('')
  const load = async () => {
    let q = supabase.from('orders').select('*, order_items(qty,unit_price,products(item_number,name)), profiles(full_name,business_name,email,phone)').order('id', { ascending: false }).limit(100)
    if (f) q = q.eq('status', f)
    const { data } = await q
    setRows(data || [])
  }
  useEffect(() => { load() }, [f])
  return (
    <>
      <div className="fm"><div><select value={f} onChange={(e) => setF(e.target.value)} aria-label="Status"><option value="">All statuses</option>{ST.map((s) => <option key={s}>{s}</option>)}</select></div></div>
      <p className="mute">Marking a wholesale order Paid or Completed saves the prices the customer paid for next time.</p>
      {rows.length === 0 && <p className="mute">No orders.</p>}
      {rows.map((o) => <Order key={o.id + o.status + String(o.ups_total)} o={o} reload={load} />)}
    </>
  )
}
