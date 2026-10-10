'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { money } from '../../lib/cart'
import { NOTICES } from '../../lib/notices'
import { STORE } from '../../lib/store'
import Support from '../../components/Support'

const LABEL = { requested: 'Request received', quoted: 'Quote ready', accepted: 'Accepted', ready: 'Ready', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled' }

function Order({ o, reload }) {
  const [err, setErr] = useState('')
  const sub = o.order_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const ship = o.delivery === 'ups'
  const total = sub + (ship ? Number(o.ups_total || 0) + Number(o.handling_fee || 0) : 0)
  const showTotal = ['quoted', 'accepted', 'ready', 'shipped', 'completed'].includes(o.status)
  async function respond(a) {
    const { error } = await supabase.rpc('respond_quote', { p_order: o.id, p_accept: a })
    if (error) setErr(error.message); else reload()
  }
  return (
    <div className="cd">
      <div className="ln"><b>Order #{o.id} · {new Date(o.created_at).toLocaleDateString()} · {ship ? 'Ship' : 'Pickup'}</b><span className={'tg ' + (o.status === 'quoted' ? 'w' : o.status === 'cancelled' ? 'b' : '')}>{LABEL[o.status]}</span></div>
      {o.order_items.map((i, k) => <div className="ln" key={k}><span>{i.qty} × {i.products?.name}{i.requested_price ? <><br /><small>You asked for {money(i.requested_price)} each{showTotal ? ' · Our price: ' + money(i.unit_price) + ' each' : ''}</small></> : null}</span><span>{showTotal ? money(i.qty * i.unit_price) : ''}</span></div>)}
      {o.status === 'requested' && <p className="note">We received your request. Our team will send your final prices{ship ? ' and shipping total' : ''} here. Nothing is charged yet.</p>}
      {showTotal && (
        <>
          <div className="ln"><span>Items total</span><b>{money(sub)}</b></div>
          {ship && <div className="ln"><span>Shipping (UPS)</span><b>{money(o.ups_total)}</b></div>}
          {ship && Number(o.handling_fee) > 0 && <div className="ln"><span>Handling</span><b>{money(o.handling_fee)}</b></div>}
          <div className="ln"><b>Your total</b><b>{money(total)}</b></div>
          {o.quote_note && <p className="mute">Note from the store: {o.quote_note}</p>}
        </>
      )}
      {o.status === 'quoted' && (
        <>
          <div className="warn"><p>{NOTICES.age}</p><p>{ship ? NOTICES.id : NOTICES.pickup}</p><p>{NOTICES.returns}</p></div>
          <div className="row"><button className="btn f" onClick={() => respond(true)}>Accept this quote</button><button className="btn d" onClick={() => respond(false)}>Decline</button></div>
        </>
      )}
      {o.status === 'accepted' && <p className="note">Quote accepted. We will tell you when your order is ready. Payment is arranged directly with the store.</p>}
      {o.status === 'ready' && (ship
        ? <p className="note"><b>Ready to ship.</b> We will send it by UPS as soon as payment is arranged with the store. Remember: an adult (21+) must sign and show ID at delivery.</p>
        : <p className="note"><b>Ready for pickup.</b> {STORE.address}{STORE.hours ? ' · ' + STORE.hours : ''}. Bring your photo ID.</p>)}
      {o.status === 'shipped' && <p className="note">Your order has shipped. An adult (21+) must sign and show ID at delivery.</p>}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

export default function Account() {
  const { user, profile, loading } = useAuth()
  const [orders, setOrders] = useState([])
  const [reqs, setReqs] = useState([])
  const [note, setNote] = useState('')

  async function load() {
    if (!user) return
    const o = await supabase.from('orders').select('*, order_items(qty,unit_price,requested_price,customer_note,products(name))').eq('customer_id', user.id).order('id', { ascending: false })
    setOrders(o.data || [])
    const r = await supabase.from('price_requests').select('*, products(name)').eq('customer_id', user.id).order('id', { ascending: false })
    setReqs(r.data || [])
  }
  useEffect(() => { load() }, [user?.id])

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
          <p>We review each wholesale application. Add your permit photo to speed things up. You will see your prices after approval.</p>
          <div className="fm">
            <div><label htmlFor="l">Permit photo</label><input id="l" type="file" accept="image/*" onChange={(e) => upload('license', e.target.files[0])} /></div>
          </div>
          {note && <p className="note">{note}</p>}
        </div>
      )}
      <h2>Orders</h2>
      {orders.length === 0 && <p className="mute">No orders yet.</p>}
      {orders.map((o) => <Order key={o.id + o.status} o={o} reload={load} />)}
      {reqs.length > 0 && <>
        <h2 style={{ marginTop: 24 }}>Price requests</h2>
        {reqs.map((r) => <div className="cd" key={r.id}><div className="ln"><b>{r.products?.name}</b><span className="tg">{r.status}</span></div>
          <p className="mute">You asked for {money(r.asked_price)}{r.approved_price ? ' · Approved at ' + money(r.approved_price) : ''}{r.reply ? ' · ' + r.reply : ''}</p></div>)}
      </>}
      <h2 style={{ marginTop: 24 }}>Support chats</h2>
      <Support user={user} />
    </>
  )
}
