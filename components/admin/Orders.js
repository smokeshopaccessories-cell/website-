'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money } from '../../lib/cart'
import { adminMessage } from '../../lib/support'

const ST = ['requested', 'quoted', 'accepted', 'ready', 'shipped', 'completed', 'cancelled']

function Order({ o, reload, saved }) {
  const ship = o.delivery === 'ups'
  // A price you agreed earlier with this customer, if it applies to this quantity and is lower than today's price.
  const sp = (i) => { const v = saved[o.customer_id + ':' + i.product_id]; return v && i.qty >= (v.min_qty || 1) && Number(v.price) < Number(i.unit_price) ? Number(v.price) : null }
  const [prices, setPrices] = useState(() => Object.fromEntries(o.order_items.map((i) => [i.id, o.status === 'requested' && sp(i) != null ? sp(i) : i.unit_price])))
  const [ups, setUps] = useState(o.ups_total ?? '')
  const [note, setNote] = useState(o.quote_note || '')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const sub = o.order_items.reduce((s, i) => s + i.qty * (Number(prices[i.id]) || 0), 0)
  const total = sub + (ship ? (Number(ups) || 0) + Number(o.handling_fee || 0) : 0)
  const c = o.profiles || {}

  async function savePrices() {
    for (const i of o.order_items) {
      const v = Number(prices[i.id])
      if (!(v >= 0)) return 'Check the prices.'
      if (v !== Number(i.unit_price)) {
        const { error } = await supabase.from('order_items').update({ unit_price: v }).eq('id', i.id)
        if (error) return error.message
      }
    }
    return null
  }
  async function sendQuote() {
    if (ship && ups === '') { setMsg('Enter the UPS shipping total before sending the quote.'); return }
    const e1 = await savePrices(); if (e1) { setMsg(e1); return }
    const { error } = await supabase.from('orders').update({ status: 'quoted', ups_total: ship ? Number(ups) : null, quote_note: note || null }).eq('id', o.id)
    if (error) { setMsg(error.message); return }
    await adminMessage(o.customer_id, 'orders', 'Order #' + o.id, 'Your quote for order #' + o.id + ' is ready: ' + money(total) + '. Please review it in My account and accept it to continue.', o.id)
    reload()
  }
  async function setStatus(s) {
    const e1 = s === 'quoted' ? null : await savePrices(); if (e1) { setMsg(e1); return }
    const patch = { status: s }
    if (ship && ups !== '') patch.ups_total = Number(ups)
    const { error } = await supabase.from('orders').update(patch).eq('id', o.id)
    if (error) { setMsg(error.message); return }
    const word = { ready: ship ? 'is ready to ship' : 'is ready for pickup at the store', shipped: 'has shipped', completed: 'is complete' }[s]
    if (word) await adminMessage(o.customer_id, 'orders', 'Order #' + o.id, 'Your order #' + o.id + ' ' + word + '.', o.id)
    reload()
  }
  async function togglePaid() { await supabase.from('orders').update({ paid: !o.paid }).eq('id', o.id); reload() }
  async function send() {
    if (!text.trim()) return
    const { error } = await adminMessage(o.customer_id, 'orders', 'Order #' + o.id, text.trim(), o.id)
    setMsg(error ? error.message : 'Message sent to the customer (see Support).'); if (!error) setText('')
  }

  return (
    <div className="cd">
      <div className="ln"><b>Order #{o.id} · {c.business_name || c.full_name} · {ship ? 'SHIP' : 'PICKUP'}</b><span>{o.order_items.some((i) => i.requested_price) && <span className="tg w">Price ask</span>} <span className={'tg ' + (o.status === 'requested' ? 'w' : o.status === 'cancelled' ? 'b' : '')}>{o.status}</span></span></div>
      <p className="mute">{c.full_name} · {c.email} · {c.phone || ''} · {new Date(o.created_at).toLocaleString()}{ship ? ' · Address: ' + (o.address || '') : ''}</p>
      <p className="mute"><small>{o.age_ack ? '✓ Customer confirmed 21+, ID at delivery/pickup, and no returns' + (o.age_ack_at ? ' on ' + new Date(o.age_ack_at).toLocaleString() : '') : 'No age confirmation recorded'}</small></p>
      {o.order_items.map((i) => (
        <div className={'ln' + (i.requested_price ? ' asked' : '')} key={i.id}>
          <span>{i.qty} × #{i.products?.item_number} {i.products?.name}<br /><small>List price {money(i.list_price ?? i.unit_price)} each</small>
            {sp(i) != null && <><br /><b className="askb">Saved quote price {money(sp(i))} each</b> <small>(agreed earlier{o.status === 'requested' ? ', already filled in below' : ''})</small> <button className="rq" onClick={() => setPrices({ ...prices, [i.id]: sp(i) })}>Use saved price</button></>}
            {i.requested_price ? <><br /><b className="askb">Customer asks for {money(i.requested_price)} each</b>{i.customer_note ? <span> · “{i.customer_note}”</span> : null} <button className="rq" onClick={() => setPrices({ ...prices, [i.id]: i.requested_price })}>Use their price</button></> : null}
          </span>
          <span>$ <input style={{ width: 90, display: 'inline-block' }} type="number" step="0.01" value={prices[i.id]} onChange={(e) => setPrices({ ...prices, [i.id]: e.target.value })} aria-label="Final price each" disabled={['shipped', 'completed', 'cancelled'].includes(o.status)} /> each</span>
        </div>
      ))}
      <div className="ln"><b>Items total</b><b>{money(sub)}</b></div>
      {ship && <div className="fm" style={{ marginTop: 8 }}>
        <div><label htmlFor={'u' + o.id}>UPS shipping total ($)</label><input id={'u' + o.id} type="number" step="0.01" value={ups} onChange={(e) => setUps(e.target.value)} /></div>
        <div><small>Handling fee: {money(o.handling_fee)}</small></div>
      </div>}
      <div className="ln"><b>Customer total</b><b>{money(total)}</b></div>
      <label htmlFor={'n' + o.id}>Note on the quote (optional, shown to the customer)</label>
      <input id={'n' + o.id} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row">
        {['requested', 'quoted'].includes(o.status) && <button className="btn f" onClick={sendQuote}>{o.status === 'quoted' ? 'Update and resend quote' : 'Send quote to customer'}</button>}
        {o.status === 'accepted' && <button className="btn f" onClick={() => setStatus('ready')}>{ship ? 'Mark ready to ship' : 'Mark ready for pickup'}</button>}
        {o.status === 'ready' && ship && <button className="btn f" onClick={() => setStatus('shipped')}>Mark shipped</button>}
        {['ready', 'shipped'].includes(o.status) && <button className="btn f" onClick={() => setStatus('completed')}>Mark completed</button>}
        {!['completed', 'cancelled'].includes(o.status) && <button className="btn d" onClick={() => { if (confirm('Cancel this order?')) setStatus('cancelled') }}>Cancel order</button>}
        <label style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={o.paid} onChange={togglePaid} /> Paid</label>
      </div>
      <div className="fm" style={{ marginTop: 10 }}><div style={{ flex: 3 }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message to the customer about this order" aria-label="Message" /></div><button className="btn" onClick={send}>Send message</button></div>
      {msg && <p className="note">{msg}</p>}
    </div>
  )
}

export default function Orders() {
  const [rows, setRows] = useState([])
  const [f, setF] = useState('requested')
  const [saved, setSaved] = useState({})
  const load = async () => {
    let q = supabase.from('orders').select('*, order_items(id,product_id,qty,unit_price,list_price,requested_price,customer_note,products(item_number,name)), profiles(full_name,business_name,email,phone)').order('id', { ascending: false }).limit(100)
    if (f) q = q.eq('status', f)
    const { data } = await q
    const ids = [...new Set((data || []).map((o) => o.customer_id))]
    let map = {}
    if (ids.length) {
      const cp = await supabase.from('customer_prices').select('customer_id,product_id,price,min_qty').in('customer_id', ids)
      map = Object.fromEntries((cp.data || []).map((r) => [r.customer_id + ':' + r.product_id, r]))
    }
    setSaved(map)
    setRows(data || [])
  }
  useEffect(() => { load() }, [f])
  return (
    <>
      <div className="fm"><div><select value={f} onChange={(e) => setF(e.target.value)} aria-label="Status"><option value="">All statuses</option>{ST.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
      <p className="mute">Flow: customer sends a request, you set final prices{' '}and the shipping total and send the quote, the customer accepts, then you mark it ready and shipped or picked up. Prices you agree in Price quotes are saved for that customer and filled in here automatically.</p>
      {rows.length === 0 && <p className="mute">No orders with this status.</p>}
      {rows.map((o) => <Order key={o.id + o.status + String(o.ups_total)} o={o} reload={load} saved={saved} />)}
    </>
  )
}
