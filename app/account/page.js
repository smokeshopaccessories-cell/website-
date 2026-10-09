'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { money } from '../../lib/cart'

export default function Account() {
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [msgs, setMsgs] = useState([])
  const [reqs, setReqs] = useState([])
  const [text, setText] = useState('')
  const [note, setNote] = useState('')

  async function load() {
    if (!user) return
    const o = await supabase.from('orders').select('*, order_items(qty,unit_price,products(name))').eq('customer_id', user.id).order('id', { ascending: false })
    setOrders(o.data || [])
    const m = await supabase.from('messages').select('*').eq('customer_id', user.id).order('created_at')
    setMsgs(m.data || [])
    const r = await supabase.from('price_requests').select('*, products(name)').eq('customer_id', user.id).order('id', { ascending: false })
    setReqs(r.data || [])
  }
  useEffect(() => { load() }, [user?.id])

  async function send() {
    if (!text.trim()) return
    await supabase.from('messages').insert({ customer_id: user.id, sender: 'customer', body: text })
    setText(''); load()
  }
  async function upload(kind, file) {
    if (!file) return
    const path = user.id + '/' + kind + '-' + Date.now() + '-' + file.name.replace(/[^a-z0-9.]/gi, '_')
    const { error } = await supabase.storage.from('wholesale-documents').upload(path, file)
    if (error) { setNote(error.message); return }
    await supabase.rpc('set_my_documents', { p_license: kind === 'license' ? path : null, p_resale: kind === 'resale' ? path : null })
    setNote('Uploaded. Our team will review your documents.')
  }

  if (loading) return <p className="mute">Loading…</p>
  if (!user) return <div className="card"><p>Please log in.</p><Link className="btn f" href="/login">Log in</Link></div>

  return (
    <>
      <div className="ph"><h1>My account</h1><p>{profile?.business_name || profile?.full_name} · {profile?.role} · <b>{profile?.status}</b></p></div>
      {profile?.role === 'wholesale' && profile.status !== 'approved' && (
        <div className="cd">
          <h3>Wholesale approval</h3>
          <p>We review each wholesale application. Upload your documents so we can approve you faster. You will see your prices after approval.</p>
          <div className="fm">
            <div><label htmlFor="l">Business license</label><input id="l" type="file" onChange={(e) => upload('license', e.target.files[0])} /></div>
            <div><label htmlFor="r">Resale certificate or tax ID</label><input id="r" type="file" onChange={(e) => upload('resale', e.target.files[0])} /></div>
          </div>
          {note && <p className="note">{note}</p>}
        </div>
      )}
      <h2>Orders</h2>
      {orders.length === 0 && <p className="mute">No orders yet.</p>}
      {orders.map((o) => {
        const sub = o.order_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
        return (
          <div className="cd" key={o.id}>
            <div className="ln"><b>Order #{o.id} · {new Date(o.created_at).toLocaleDateString()}</b><span className="tg">{o.status}</span></div>
            {o.order_items.map((i, k) => <div className="ln" key={k}><span>{i.qty} × {i.products?.name}</span><span>{money(i.qty * i.unit_price)}</span></div>)}
            <div className="ln"><span>Items total</span><b>{money(sub)}</b></div>
            <div className="ln"><span>UPS shipping</span><b>{o.ups_total != null ? money(o.ups_total) : 'We will confirm it'}</b></div>
            {o.ups_total != null && <div className="ln"><span>Order total</span><b>{money(sub + Number(o.ups_total) + Number(o.handling_fee || 0))}</b></div>}
          </div>
        )
      })}
      {reqs.length > 0 && <>
        <h2 style={{ marginTop: 24 }}>Price requests</h2>
        {reqs.map((r) => <div className="cd" key={r.id}><div className="ln"><b>{r.products?.name}</b><span className="tg">{r.status}</span></div>
          <p className="mute">You asked for {money(r.asked_price)}{r.approved_price ? ' · Approved at ' + money(r.approved_price) : ''}{r.reply ? ' · ' + r.reply : ''}</p></div>)}
      </>}
      <h2 style={{ marginTop: 24 }}>Messages</h2>
      <div className="cd">
        {msgs.length === 0 && <p className="mute">No messages yet.</p>}
        {msgs.map((m) => <p key={m.id}><b>{m.sender === 'admin' ? 'Store' : 'You'}:</b> {m.body}</p>)}
        <div className="fm"><div style={{ flex: 3 }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message to the store" aria-label="Message" /></div><button className="btn f" onClick={send}>Send</button></div>
      </div>
    </>
  )
}
