'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addToCart, money } from '../lib/cart'

export default function ProductCard({ p, user, profile }) {
  const router = useRouter()
  const [qv, setQv] = useState(false)
  const sold = p.status === 'sold'
  const pending = user && profile && profile.status !== 'approved'

  let price
  if (sold) price = <span className="sold">Sold</span>
  else if (p.price != null) price = <span>{money(p.price)}</span>
  else price = <span className="lk">{pending ? 'Pending approval' : 'Log in to see price'}</span>

  const order = () => { if (!user) router.push('/login'); else { addToCart(p); setQv(false) } }
  const label = sold ? 'Sold' : !user ? 'Log in to order' : 'Add to order request'

  return (
    <div className="pr">
      {p.on_deal && !sold && <span className="bd d">DEAL</span>}
      {!p.on_deal && p.status === 'low' && <span className="bd l">LOW STOCK</span>}
      <button className="im" onClick={() => setQv(true)} aria-label={'Quick view ' + p.name}>
        {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span>{p.brand || 'Photo'}</span>}
        <span className="qv">Quick View</span>
      </button>
      <b>{p.name}</b>
      <small>{p.description}</small>
      <div className="p">{price}</div>
      <button className="add" disabled={sold} onClick={order}>{label}</button>
      {qv && (
        <div className="ov c" onClick={(e) => { if (e.target === e.currentTarget) setQv(false) }}>
          <div className="md big" role="dialog" aria-modal="true" aria-label={p.name}>
            <div className="qvg">
              {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="ph0">No photo yet</div>}
              <div>
                <h2>{p.name}</h2>
                {p.brand && <p className="mute">Brand: {p.brand}</p>}
                <p>{p.description}</p>
                <div className="p" style={{ font: '700 26px Fraunces,serif', margin: '12px 0' }}>{price}</div>
                <div className="row"><button className="btn f" disabled={sold} onClick={order}>{label}</button><button className="btn" onClick={() => setQv(false)}>Close</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
