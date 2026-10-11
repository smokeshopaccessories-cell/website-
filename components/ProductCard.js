'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addToCart, money } from '../lib/cart'
import QuickView from './QuickView'
import PriceLine from './PriceLine'
import { useSavedPrices } from '../lib/quotes'

export default function ProductCard({ p, user, profile }) {
  const router = useRouter()
  const [qv, setQv] = useState(false)
  const saved = useSavedPrices(user)
  const sold = p.status === 'sold'
  const pending = user && profile && profile.status !== 'approved'

  let price
  if (sold) price = <span className="sold">Sold</span>
  else if (p.price != null) price = <PriceLine p={p} saved={saved} />
  else price = <span className="lk">{pending ? 'Pending approval' : 'Log in to see price'}</span>

  const quick = () => { if (!user) router.push('/login'); else addToCart(p, 1) }
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
      <button className="add" disabled={sold} onClick={quick}>{label}</button>
      {qv && <QuickView p={p} user={user} profile={profile} onClose={() => setQv(false)} />}
    </div>
  )
}
