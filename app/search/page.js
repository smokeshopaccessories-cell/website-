'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import ProductCard from '../../components/ProductCard'

export default function Search() {
  const { user, profile } = useAuth()
  const [q, setQ] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    const read = () => setQ(new URLSearchParams(window.location.search).get('q') || '')
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])
  useEffect(() => {
    if (q) supabase.rpc('catalog', { p_q: q, p_limit: 60, p_offset: 0 }).then(({ data }) => setItems(data || []))
  }, [q, user?.id])

  return (
    <>
      <div className="ph"><h1>Results for “{q}”</h1></div>
      <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />)}</div>
      {q && items.length === 0 && <p className="mute">No products found.</p>}
    </>
  )
}
