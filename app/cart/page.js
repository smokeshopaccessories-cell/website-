'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { getCart, saveCart, money } from '../../lib/cart'

export default function Cart() {
  const { user, profile, loading } = useAuth()
  const [items, setItems] = useState([])
  const [delivery, setDelivery] = useState('ups')
  const [address, setAddress] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setItems(getCart()) }, [])
  const change = (id, d) => {
    const c = getCart().map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0)
    saveCart(c); setItems(c)
  }
  const sub = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  async function place() {
    setErr('')
    if (delivery === 'ups' && !address.trim()) { setErr('Please enter a shipping address.'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('place_order', {
      items: items.map((i) => ({ product_id: i.id, qty: i.qty })), p_delivery: delivery, p_address: address,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    saveCart([]); setItems([])
    setMsg('Order request #' + data + ' received. We will contact you with your total, including UPS shipping, and arrange payment.')
  }

  if (msg) return <div className="card"><h2>Thank you</h2><p className="note">{msg}</p><div className="row"><Link className="btn f" href="/account">View my orders</Link></div></div>
  if (!loading && !user) return <div className="card"><h2>Order request</h2><p>Please log in to place an order request.</p><div className="row"><Link className="btn f" href="/login">Log in</Link><Link className="btn" href="/signup">Sign up</Link></div></div>
  const approved = profile?.status === 'approved'

  return (
    <div className="card">
      <h2>Order request</h2>
      {items.length === 0 && <p className="mute">Your order request is empty.</p>}
      {items.map((i) => (
        <div className="ln" key={i.id}>
          <span>{i.name}<br /><small>{money(i.price)} each</small></span>
          <span className="row" style={{ margin: 0 }}><button className="btn" onClick={() => change(i.id, -1)} aria-label="Less">−</button>{i.qty}<button className="btn" onClick={() => change(i.id, 1)} aria-label="More">+</button></span>
        </div>
      ))}
      {items.length > 0 && (
        <>
          <div className="ln"><b>Estimated items total</b><b>{money(sub)}</b></div>
          <label>Delivery</label>
          <label style={{ fontWeight: 400 }}><input type="radio" style={{ width: 'auto' }} checked={delivery === 'ups'} onChange={() => setDelivery('ups')} /> Ship with UPS (we confirm the shipping total)</label>
          <label style={{ fontWeight: 400 }}><input type="radio" style={{ width: 'auto' }} checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} /> Store pickup</label>
          {delivery === 'ups' && <><label htmlFor="a">Shipping address</label><textarea id="a" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} /></>}
          <p className="note">No payment is taken online. We review your request, add the UPS shipping total, and contact you to arrange payment. Final prices are confirmed by our system.</p>
          {!approved && <p className="err">Your account is waiting for approval, so you can't place orders yet.</p>}
          {err && <p className="err">{err}</p>}
          <div className="row"><button className="btn f" disabled={busy || !approved} onClick={place}>{busy ? 'Sending…' : 'Place order request'}</button></div>
        </>
      )}
    </div>
  )
}
