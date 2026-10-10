'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { getCart, saveCart, money } from '../../lib/cart'
import { NOTICES } from '../../lib/notices'

export default function Cart() {
  const { user, profile, loading } = useAuth()
  const [items, setItems] = useState([])
  const [delivery, setDelivery] = useState('ups')
  const [address, setAddress] = useState('')
  const [ack, setAck] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setItems(getCart()) }, [])
  const change = (id, d) => {
    const c = getCart().map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)
    saveCart(c); setItems(c)
  }
  const setField = (id, k, v) => {
    const c = getCart().map((i) => (i.id === id ? { ...i, [k]: v } : i))
    saveCart(c); setItems(c)
  }
  const sub = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  async function place() {
    setErr('')
    if (delivery === 'ups' && !address.trim()) { setErr('Please enter a shipping address.'); return }
    if (!ack) { setErr('Please tick the box to confirm the age, ID and no-returns notice.'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('place_order', {
      items: items.map((i) => ({ product_id: i.id, qty: i.qty, requested_price: i.ask || '', note: i.note || '' })), p_delivery: delivery, p_address: address, p_ack: true,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    saveCart([]); setItems([])
    setMsg('Request #' + data + ' sent. We will review it and send you your final prices' + (delivery === 'ups' ? ' and shipping total' : '') + '. You will see them in My account, and you can accept or decline before anything is paid.')
  }

  if (msg) return <div className="card"><h2>Request sent</h2><p className="note">{msg}</p><div className="row"><Link className="btn f" href="/account">View my orders</Link></div></div>
  if (!loading && !user) return <div className="card"><h2>Order request</h2><p>Please log in to send an order request.</p><div className="row"><Link className="btn f" href="/login">Log in</Link><Link className="btn" href="/signup">Sign up</Link></div></div>
  const approved = profile?.status === 'approved'

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Order request</h2>
      <p className="note">There is no instant checkout. For any item you can ask for a lower price right here. Send your request, and our team replies with your <b>final prices{delivery === 'ups' ? ' and shipping total' : ''}</b>. You then accept the quote and we tell you when it is ready.</p>
      {items.length === 0 && <p className="mute">Your order request is empty.</p>}
      {items.map((i) => (
        <div className="item" key={i.id}>
          <div className="ln" style={{ border: 0 }}>
            <span><b>{i.name}</b><br /><small>List price {money(i.price)} each. Our team confirms the final price.</small></span>
            <span className="row" style={{ margin: 0 }}><button className="btn" onClick={() => change(i.id, -1)} aria-label="Less">−</button>{i.qty}<button className="btn" onClick={() => change(i.id, 1)} aria-label="More">+</button></span>
          </div>
          <div className="ask">
            <div className="fm">
              <div style={{ maxWidth: 190 }}>
                <label htmlFor={'ask' + i.id}>Want a lower price? Your price each ($)</label>
                <input id={'ask' + i.id} type="number" step="0.01" min="0" placeholder="Optional" value={i.ask || ''} onChange={(e) => setField(i.id, 'ask', e.target.value)} />
              </div>
              <div style={{ flex: 2 }}>
                <label htmlFor={'note' + i.id}>Note for this item (optional)</label>
                <input id={'note' + i.id} maxLength={300} placeholder="For example: I can get it for less elsewhere" value={i.note || ''} onChange={(e) => setField(i.id, 'note', e.target.value)} />
              </div>
            </div>
            {i.ask && Number(i.ask) > 0 && <small className="mute">We will see you asked for {money(Number(i.ask))} each on this item.</small>}
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <>
          <div className="ln"><b>Estimated items total</b><b>{money(sub)}</b></div>
          <label>How do you want to get your order?</label>
          <label style={{ fontWeight: 500 }}><input type="radio" style={{ width: 'auto' }} checked={delivery === 'ups'} onChange={() => setDelivery('ups')} /> Ship it to me (UPS)</label>
          <label style={{ fontWeight: 500 }}><input type="radio" style={{ width: 'auto' }} checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> I will pick it up at the store</label>
          {delivery === 'ups' && <><label htmlFor="a">Shipping address</label><textarea id="a" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} /></>}
          <div className="warn">
            <b>Read before you order</b>
            <p>{NOTICES.age}</p>
            <p>{delivery === 'ups' ? NOTICES.id : NOTICES.pickup}</p>
            <p>{NOTICES.returns}</p>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontWeight: 500 }}><input type="checkbox" style={{ width: 'auto', marginTop: 4 }} checked={ack} onChange={(e) => setAck(e.target.checked)} /> {NOTICES.ack}</label>
          {!approved && <p className="err">Your account is waiting for approval, so you can't send requests yet.</p>}
          {err && <p className="err">{err}</p>}
          <div className="row"><button className="btn f" disabled={busy || !approved} onClick={place}>{busy ? 'Sending…' : 'Send request for final price'}</button></div>
        </>
      )}
    </div>
  )
}
