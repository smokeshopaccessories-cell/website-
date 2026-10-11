'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { STORE } from '../lib/store'
import ProductCard from '../components/ProductCard'
import BannerSlider from '../components/BannerSlider'
import Showcase from '../components/Showcase'

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
    supabase.rpc('catalog', { p_limit: 16, p_offset: 0 }).then(({ data }) => setFeatured((data || []).filter((p) => p.status !== 'sold')))
  }, [user?.id])
  useEffect(() => {
    brands.slice(0, 4).forEach((b) => {
      supabase.rpc('catalog', { p_brand: b.brand, p_limit: 16, p_offset: 0 }).then(({ data }) => setRows((r) => ({ ...r, [b.brand]: (data || []).filter((p) => p.status !== 'sold') })))
    })
  }, [brands, user?.id])

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

      <div id="deals" />
      {deals.length >= 3
        ? <Showcase title="Deals right now" products={deals} variant="deal" />
        : deals.length > 0 && (
          <div className="deals">
            <div className="hd"><h2>Deals right now</h2></div>
            <div className="grid">{deals.map((p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />)}</div>
          </div>
        )}

      <Showcase title="Best sellers" products={featured} />

      {brands.slice(0, 4).map((b) => (
        <Showcase key={b.brand} title={b.brand} products={rows[b.brand] || []} link={'/search?q=' + encodeURIComponent(b.brand)} />
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
