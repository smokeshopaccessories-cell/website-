'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addToCart, money } from '../lib/cart'
import Modal from './Modal'

// Product pop-up with photo, details, quantity and add button.
export default function QuickView({ p, user, profile, onClose }) {
  const router = useRouter()
  const [n, setN] = useState(1)
  const [added, setAdded] = useState(false)
  const sold = p.status === 'sold'
  const pending = user && profile && profile.status !== 'approved'
  const max = p.qty_left || 999

  let price
  if (sold) price = <span className="sold">Sold</span>
  else if (p.price != null) price = <span>{money(p.price)}</span>
  else price = <span className="lk">{pending ? 'Pending approval' : 'Log in to see price'}</span>

  function add() {
    if (!user) { router.push('/login'); return }
    addToCart(p, n); setAdded(true)
  }

  return (
    <Modal onClose={onClose} label={p.name} wide>
      <button className="xbtn" onClick={onClose} aria-label="Close">×</button>
      <div className="qvg">
        <div className="qimg">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="ph0">No photo yet</div>}</div>
        <div className="qinfo">
          <h2>{p.name}</h2>
          {p.brand && <p className="mute">Brand: <b>{p.brand}</b></p>}
          {p.description && <p>{p.description}</p>}
          <div className="qprice">{price}</div>
          {!sold && p.status === 'in_stock' && <span className="tg">In stock</span>}
          {!sold && p.status === 'low' && <span className="tg w">Low stock{p.qty_left ? ': only ' + p.qty_left + ' left' : ''}</span>}
          {!sold && user && (
            <>
              <label htmlFor={'q' + p.id}>How many?</label>
              <div className="stepper">
                <button type="button" onClick={() => setN(Math.max(1, n - 1))} aria-label="One less">−</button>
                <input id={'q' + p.id} type="number" min="1" max={max} value={n} onChange={(e) => setN(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))} />
                <button type="button" onClick={() => setN(Math.min(max, n + 1))} aria-label="One more">+</button>
              </div>
              {p.qty_left ? <small className="mute"> You can request up to {p.qty_left}.</small> : null}
            </>
          )}
          {p.price != null && !sold && user && <p className="qtot">Estimated total: <b>{money(p.price * n)}</b> <small className="mute">(final price confirmed by our team)</small></p>}
          <div className="row">
            <button className="btn f" disabled={sold} onClick={add}>{sold ? 'Sold' : !user ? 'Log in to order' : added ? 'Added ✓ Add more' : 'Add ' + n + ' to order request'}</button>
            {added && <button className="btn" onClick={() => router.push('/cart')}>View order request</button>}
          </div>
          {added && <p className="note">Added to your order request.</p>}
          <p className="mute"><small>21+ only. Shipped orders need an adult signature and ID at delivery. All sales are final.</small></p>
        </div>
      </div>
    </Modal>
  )
}
