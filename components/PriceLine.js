'use client'
import { money } from '../lib/cart'
import { priceFor } from '../lib/quotes'

// Shows the list price, or the customer's saved quoted price when one applies to this quantity.
export default function PriceLine({ p, saved, qty = 1 }) {
  const r = priceFor(saved, p.id, p.price, qty)
  if (r.saved) return <span><s className="mute" style={{ fontWeight: 400 }}>{money(p.price)}</s> {money(r.price)} <small className="tg">Your price</small></span>
  const s = saved?.[String(p.id)]
  if (s && Number(s.price) < Number(p.price)) return <span>{money(p.price)}<br /><small><b>Your quoted price {money(s.price)}</b> at {s.min_qty}+ pcs</small></span>
  return <span>{money(p.price)}</span>
}
