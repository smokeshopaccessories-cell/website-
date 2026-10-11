'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { money } from '../../lib/cart'
import { NOTICES } from '../../lib/notices'
import { STORE } from '../../lib/store'
import Support from '../../components/Support'
import DocPicker from '../../components/DocPicker'
import { QuoteThread } from '../../components/QuoteBox'
import { DOC_TYPES, checkFiles, uploadDocs } from '../../lib/docs'
import { useMyQuotes, useSavedPrices } from '../../lib/quotes'

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
  const [docs, setDocs] = useState([])
  const [mine, setMine] = useState([])
  const [busyDocs, setBusyDocs] = useState(false)
  const { quotes, reload: reloadQuotes } = useMyQuotes(user)
  const saved = useSavedPrices(user)
  const [names, setNames] = useState({})

  async function loadDocs() {
    if (!user) return
    const d = await supabase.from('wholesale_documents').select('*').eq('customer_id', user.id).order('id', { ascending: false })
    setMine(d.data || [])
  }

  async function load() {
    if (!user) return
    const o = await supabase.from('orders').select('*, order_items(qty,unit_price,requested_price,customer_note,products(name))').eq('customer_id', user.id).order('id', { ascending: false })
    setOrders(o.data || [])
    const r = await supabase.from('price_requests').select('*, products(name)').eq('customer_id', user.id).order('id', { ascending: false })
    setReqs(r.data || [])
  }
  useEffect(() => { load(); loadDocs() }, [user?.id])
  useEffect(() => {
    const ids = Object.keys(saved)
    if (!ids.length) return
    supabase.from('products').select('id,name').in('id', ids).then(({ data }) => setNames(Object.fromEntries((data || []).map((x) => [String(x.id), x.name]))))
  }, [saved])

  async function uploadAll() {
    const bad = checkFiles(docs)
    if (bad) { setNote(bad); return }
    setBusyDocs(true)
    const r = await uploadDocs(user.id, docs)
    setBusyDocs(false)
    setNote(r.failed ? r.done + ' uploaded, ' + r.failed + ' failed. Please try the failed ones again.' : 'Uploaded. Our team will review your documents.')
    if (r.done) setDocs([])
    loadDocs()
  }
  async function removeDoc(d) {
    await supabase.storage.from('wholesale-documents').remove([d.path])
    await supabase.from('wholesale_documents').delete().eq('id', d.id)
    loadDocs()
  }

  if (loading) return <p className="mute">Loading…</p>
  if (!user) return <div className="card"><p>Please log in.</p><Link className="btn f" href="/login">Log in</Link></div>

  return (
    <>
      <div className="ph"><h1>My account</h1><p>{profile?.business_name || profile?.full_name} · {profile?.role} · <b>{profile?.status}</b></p></div>
      {profile?.role === 'wholesale' && (
        <div className="cd">
          <h3>{profile.status !== 'approved' ? 'Wholesale approval' : 'License & permit pictures'}</h3>
          {profile.status !== 'approved' && <p>We review each wholesale application. Add pictures of your licenses and permits to speed things up. You will see your prices after approval.</p>}
          {mine.length > 0 && mine.map((d) => (
            <div className="ln" key={d.id}><span><b>{DOC_TYPES[d.doc_type] || 'Other'}</b> · <small>{d.file_name}</small></span>{profile.status !== 'approved' && <button className="btn d" onClick={() => removeDoc(d)}>Remove</button>}</div>
          ))}
          <DocPicker items={docs} onChange={setDocs} />
          {docs.length > 0 && <div className="row"><button className="btn f" disabled={busyDocs} onClick={uploadAll}>{busyDocs ? 'Uploading…' : 'Upload ' + docs.length + ' picture' + (docs.length > 1 ? 's' : '')}</button></div>}
          {note && <p className="note">{note}</p>}
        </div>
      )}
      <h2>Orders</h2>
      {orders.length === 0 && <p className="mute">No orders yet.</p>}
      {orders.map((o) => <Order key={o.id + o.status} o={o} reload={load} />)}
      {(quotes.length > 0 || Object.keys(saved).length > 0) && <>
        <h2 style={{ marginTop: 24 }}>My price quotes</h2>
        {Object.keys(saved).length > 0 && (
          <div className="cd">
            <b>Your saved prices</b>
            <p className="mute"><small>These prices were agreed with the store. They show on the product and in your order request on future orders.</small></p>
            {Object.entries(saved).map(([pid, v]) => <div className="ln" key={pid}><span>{names[pid] || 'Item #' + pid}</span><b>{money(v.price)} each{v.min_qty > 1 ? ' · ' + v.min_qty + '+ pcs' : ''}</b></div>)}
          </div>
        )}
        {quotes.filter((q) => q.status !== 'accepted').map((q) => <div className="cd" key={q.id + q.status}><QuoteThread q={q} reload={reloadQuotes} /></div>)}
      </>}
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
