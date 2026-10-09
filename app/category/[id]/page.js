'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/useAuth'
import ProductCard from '../../../components/ProductCard'

const PS = 48

export default function Category() {
  const { id } = useParams()
  const cid = Number(id)
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [brands, setBrands] = useState([])
  const [brand, setBrand] = useState(null)
  const [items, setItems] = useState([])
  const [more, setMore] = useState(false)

  useEffect(() => {
    setBrand(new URLSearchParams(window.location.search).get('brand') || '')
    supabase.from('categories').select('name').eq('id', cid).maybeSingle().then(({ data }) => setName(data?.name || ''))
    supabase.rpc('brands', { p_category: cid }).then(({ data }) => setBrands(data || []))
  }, [cid])

  async function load(offset) {
    const { data } = await supabase.rpc('catalog', { p_category: cid, p_brand: brand || null, p_limit: PS, p_offset: offset })
    const rows = data || []
    setItems((prev) => (offset ? [...prev, ...rows] : rows))
    setMore(rows.length === PS)
  }
  useEffect(() => { if (brand !== null) load(0) }, [cid, brand, user?.id])

  return (
    <>
      <div className="ph"><h1>{name || 'Category'}</h1></div>
      <div className="chips">
        <button className={!brand ? 'on' : ''} onClick={() => setBrand('')}>All brands</button>
        {brands.map((b) => <button key={b.brand} className={brand === b.brand ? 'on' : ''} onClick={() => setBrand(b.brand)}>{b.brand}</button>)}
      </div>
      <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} user={user} profile={profile} />)}</div>
      {items.length === 0 && <p className="mute">No products found.</p>}
      {more && <button className="btn more" onClick={() => load(items.length)}>Show more</button>}
    </>
  )
}
