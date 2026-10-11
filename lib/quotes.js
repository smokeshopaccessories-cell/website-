'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// How many pieces a customer must order before the "ask for a better price" box appears.
export function minQtyFor(rules, price) {
  const p = Number(price)
  if (!rules || !(p > 0)) return Infinity
  const band = [...rules].sort((a, b) => b.min_price - a.min_price)
    .find((r) => p >= Number(r.min_price) && (r.max_price == null || p < Number(r.max_price)))
  return band ? band.min_qty : Infinity
}

// Is quoting switched on for this customer, and what are the quantity rules?
export function useQuoteAccess(user, profile) {
  const [s, setS] = useState({ allowed: false, rules: [] })
  useEffect(() => {
    if (!user || profile?.status !== 'approved') { setS({ allowed: false, rules: [] }); return }
    supabase.rpc('quote_my_access').then(({ data }) => { if (data) setS({ allowed: !!data.allowed, rules: data.rules || [] }) })
  }, [user?.id, profile?.status])
  return s
}

// All of this customer's quotes with their history.
export function useMyQuotes(user) {
  const [quotes, setQuotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    if (!user) { setQuotes([]); setLoaded(true); return }
    const { data } = await supabase.from('quotes')
      .select('*, products(name,item_number), quote_offers(id,actor,action,price,note,created_at)')
      .eq('customer_id', user.id).order('id', { ascending: false })
    setQuotes((data || []).map((q) => ({ ...q, quote_offers: (q.quote_offers || []).sort((a, b) => a.id - b.id) })))
    setLoaded(true)
  }, [user?.id])
  useEffect(() => { load() }, [load])
  return { quotes, loaded, reload: load }
}

// Prices the store agreed with this customer (used on future orders).
let cache = { uid: null, promise: null }
export function reloadSavedPrices() { cache = { uid: null, promise: null }; window.dispatchEvent(new Event('savedprices')) }
export function useSavedPrices(user) {
  const [map, setMap] = useState({})
  useEffect(() => {
    let on = true
    const run = () => {
      if (!user) { setMap({}); return }
      if (cache.uid !== user.id || !cache.promise) {
        cache = { uid: user.id, promise: supabase.from('customer_prices').select('product_id,price,min_qty').eq('customer_id', user.id).then(({ data }) => data || []) }
      }
      cache.promise.then((rows) => { if (on) setMap(Object.fromEntries(rows.map((r) => [String(r.product_id), r]))) })
    }
    run()
    window.addEventListener('savedprices', run)
    return () => { on = false; window.removeEventListener('savedprices', run) }
  }, [user?.id])
  return map
}

// The price to show: the saved quoted price when it applies, never higher than the current list price.
export function priceFor(saved, productId, listPrice, qty = 1) {
  const s = saved?.[String(productId)]
  if (!s || listPrice == null) return { price: listPrice, saved: false }
  if (qty < (s.min_qty || 1)) return { price: listPrice, saved: false, minQty: s.min_qty }
  const p = Number(s.price)
  return p < Number(listPrice) ? { price: p, saved: true, minQty: s.min_qty } : { price: listPrice, saved: false }
}
