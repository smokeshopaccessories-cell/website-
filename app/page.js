'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { STORE } from '../lib/store'
import ProductCard from '../components/ProductCard'
import BannerSlider from '../components/BannerSlider'
import Scroller from '../components/Scroller'

export default function Home() {
  const { user, profile } = useAuth()
  const [cats, setCats] = useState([])
  const [deals, setDeals] = useState([])
  const [featured, setFeatured] = useState([])
  const [brands, setBrands] = useState([])
  const [logos, setLogos] = useState({})
  const [rows, setRows] = useState({})

  useEffect(() => {
    supabase.from('categories').select('id,name').eq('visible', true).order('sort').then(({ data }) => setCats(data || []))
    supabase.from('brand_logos').select('*').then(({ data }) => setLogos(Object.fromEntries((data || []).map((x) => [x.brand, x.logo_url]))))
    supabase.rpc('top_brands', { p_limit: 14 }).then(({ data }) => setBrands(data || []))
  }, [])
  useEffect(() => {
    supabase.rpc('deal_items').then(({ data }) => setDeals(data || []))
    supabase.rpc('catalog', { p_limit: 12, p_offset: 0 }).then(({ data }) => setFeatured((data || []).filter((p) => p.status !== 'sold')))
  }, [user?.id])
  useEffect(() => {
    brands.slice(0, 3).forEach((b) => {
      supabase.rpc('catalog', { p_brand: b.brand, p_limit: 10, p_offset: 0 }).then(({ data }) => setRows((r) => ({ ...r, [b.brand]: (data || []).filter((p) => p.status !== 'sold') })))
    })
  }, [brands, user?.id])

  const card = (p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />

  return (
    <>
      <BannerSlider />

      {brands.length > 0 && (
        <div className="brands" aria-label="Brands">
          {brands.map((b) => (
            <Link key={b.brand} href={'/search?q=' + encodeURIComponent(b.brand)} aria-label={b.brand}>
              {logos[b.brand] ? <img src={logos[b.brand]} alt={b.brand} /> : <span>{b.brand}</span>}
            </Link>
          ))}
        </div>
      )}

      {deals.length > 0 && (
        <div className="deals" id="deals">
          <div className="hd"><h2>Deals right now</h2></div>
          <Scroller>{deals.map(card)}</Scroller>
        </div>
      )}

      <div className="hd"><h2>Best sellers</h2></div>
      <Scroller>{featured.map(card)}</Scroller>

      {brands.slice(0, 3).map((b) => (rows[b.brand] || []).length > 0 && (
        <div key={b.brand}>
          <div className="hd"><h2>{b.brand}</h2><Link href={'/search?q=' + encodeURIComponent(b.brand)}>View all</Link></div>
          <Scroller>{rows[b.brand].map(card)}</Scroller>
        </div>
      ))}

      <div className="hd"><h2>Shop by category</h2></div>
      <div className="tiles">
        {cats.map((c) => <Link key={c.id} className="tile" href={'/category/' + c.id}><span>{c.name}</span></Link>)}
      </div>

      <section className="band">
        <h2>{STORE.freeShipOver ? 'Fast & free shipping for orders above $' + STORE.freeShipOver : 'Fast UPS shipping, confirmed by our team'}</h2>
      </section>
      <div className="trust">
        <div><b>Bulk buying discounts</b><span className="mute">Wholesale accounts get their own pricing</span></div>
        <div><b>Pay with the store</b><span className="mute">No online payment. We contact you to arrange it</span></div>
        <div><b>Expert advice</b><span className="mute">In store, by phone or email</span></div>
      </div>
    </>
  )
}
