'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { addToCart, money } from '../lib/cart'

export default function ProductCard({ p, user, profile }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [ask, setAsk] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const sold = p.status === 'sold'
  const pending = user && profile && profile.status !== 'approved'
  const canAsk = profile?.role === 'wholesale' && profile?.status === 'approved' && !sold

  let price
  if (sold) price = <span className="sold">Sold</span>
  else if (p.price != null) price = <span>{money(p.price)}</span>
  else price = <span className="lk">{pending ? 'Pending approval' : 'Log in to see price'}</span>

  async function send() {
    const v = parseFloat(ask)
    if (!v) { setMsg('Enter the price you were offered.'); return }
    const { error } = await supabase.from('price_requests').insert({ customer_id: profile.id, product_id: p.id, asked_price: v, note })
    setMsg(error ? error.message : 'Request sent. We will reply in your account.')
    if (!error) setTimeout(() => setOpen(false), 1500)
  }

  return (
    <div className="pr">
      {p.on_deal && !sold && <span className="bd d">Deal</span>}
      {!p.on_deal && p.status === 'low' && <span className="bd l">Low stock</span>}
      <div className="im">{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span>{p.brand || 'Photo'}</span>}</div>
      <b>{p.name}</b>
      <small>{p.description}</small>
      <div className="p">{price}</div>
      <button className="add" disabled={sold} onClick={() => { if (!user) router.push('/login'); else addToCart(p) }}>
        {sold ? 'Sold' : !user ? 'Log in to order' : 'Add to order request'}
      </button>
      {canAsk && <button className="rq" onClick={() => { setOpen(true); setMsg('') }}>Request a better price</button>}
      {open && (
        <div className="ov c" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="md" role="dialog" aria-modal="true" aria-label="Request a better price">
            <h2>Request a better price</h2>
            <p><b>{p.name}</b><br /><small>Your price now {money(p.price)}</small></p>
            <label htmlFor={'a' + p.id}>Price you can get elsewhere ($)</label>
            <input id={'a' + p.id} type="number" step="0.01" value={ask} onChange={(e) => setAsk(e.target.value)} />
            <label htmlFor={'n' + p.id}>Note (optional)</label>
            <textarea id={'n' + p.id} rows="2" value={note} onChange={(e) => setNote(e.target.value)} />
            {msg && <p className="note">{msg}</p>}
            <div className="row"><button className="btn f" onClick={send}>Send request</button><button className="btn" onClick={() => setOpen(false)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
