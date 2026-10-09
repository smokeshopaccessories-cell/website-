'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const { user, profile } = useAuth()
  const [cats, setCats] = useState([])
  const [deals, setDeals] = useState([])
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    supabase.from('categories').select('id,name').eq('visible', true).order('sort').then(({ data }) => setCats(data || []))
  }, [])
  useEffect(() => {
    supabase.rpc('deal_items').then(({ data }) => setDeals(data || []))
    supabase.rpc('catalog', { p_limit: 8, p_offset: 0 }).then(({ data }) => setFeatured((data || []).filter((p) => p.status !== 'sold')))
  }, [user?.id])

  return (
    <>
      <section className="hero">
        <h1>Everything for your smoke shop shelf, <i>in one place.</i></h1>
        <p>Browse by category and request an order. We confirm your total, including UPS shipping, and arrange payment with you directly.</p>
        <div className="row">
          <Link className="btn" href="/signup">Create account</Link>
          <Link className="btn" href="/signup?type=wholesale">Apply for wholesale</Link>
        </div>
      </section>

      {deals.length > 0 && (
        <>
          <div className="hd"><h2>Deals right now</h2></div>
          <div className="grid">{deals.map((p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />)}</div>
        </>
      )}

      <div className="hd"><h2>Featured</h2></div>
      <div className="grid">{featured.map((p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />)}</div>

      <div className="hd"><h2>Shop by category</h2></div>
      <div className="tiles">
        {cats.map((c) => <Link key={c.id} className="tile" href={'/category/' + c.id}><span>{c.name}</span></Link>)}
      </div>
    </>
  )
}
