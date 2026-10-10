'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/cart'
import { useAuth } from '../lib/useAuth'

// Auto-scrolling strip of products from one category.
export default function Showcase({ categoryId, title }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  useEffect(() => {
    supabase.rpc('catalog', { p_category: categoryId, p_limit: 16, p_offset: 0 }).then(({ data }) => {
      const ok = (data || []).filter((p) => p.status !== 'sold')
      setItems([...ok.filter((p) => p.image_url), ...ok.filter((p) => !p.image_url)].slice(0, 14))
    })
  }, [categoryId, user?.id])
  if (items.length < 3) return null
  const loop = [...items, ...items]
  return (
    <section className="show" aria-label={'Showcase: ' + title}>
      <div className="shh">★ {title} showcase</div>
      <div className="trk">
        {loop.map((p, k) => (
          <Link key={k} className="shi" href={'/search?q=' + encodeURIComponent(p.name)} aria-hidden={k >= items.length ? 'true' : undefined} tabIndex={k >= items.length ? -1 : undefined}>
            {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span className="sp0">{p.brand || 'Photo'}</span>}
            <b>{p.name}</b>
            <small>{p.price != null ? money(p.price) : ''}</small>
          </Link>
        ))}
      </div>
    </section>
  )
}
