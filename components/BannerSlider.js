'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function BannerSlider({ categoryId = null }) {
  const [items, setItems] = useState(null)
  const [i, setI] = useState(0)

  useEffect(() => {
    setItems(null); setI(0)
    let q = supabase.from('banners').select('*').eq('active', true)
    q = categoryId ? q.eq('category_id', categoryId) : q.is('category_id', null)
    q.order('sort').order('id').then(({ data }) => setItems(data || []))
  }, [categoryId])
  const n = items ? Math.max(items.length, 1) : 1
  useEffect(() => {
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500)
    return () => clearInterval(t)
  }, [n])
  if (items === null) return categoryId ? null : <div className="ban" style={{ aspectRatio: '16/6' }} />
  if (categoryId && items.length === 0) return null

  const fallback = (
    <div className="hero">
      <div className="hl">
        <span className="stk">21+ ONLY</span>
        <h1>Stock your shelf with <mark>the good stuff.</mark></h1>
        <p>Papers, glass, vapes, hookah and more. Browse, send an order request, and we confirm your final prices and shipping total before anything is paid.</p>
        <div className="row"><Link className="btn f" href="/signup">Create account</Link><Link className="btn" href="/signup?type=wholesale">Apply for wholesale</Link></div>
      </div>
      <div className="hr" aria-hidden="true"><b>Papers</b><b>Glass</b><b>Vapes</b><b>Hookah</b><b>Scales</b></div>
    </div>
  )
  return (
    <div className="ban" aria-roledescription="carousel">
      <div className="tr" style={{ transform: 'translateX(-' + i * 100 + '%)' }}>
        {items.length === 0 ? fallback : items.map((b) => b.link
          ? <Link key={b.id} className="sl" href={b.link}><img src={b.image_url} alt={b.title || 'Promotion'} /></Link>
          : <div key={b.id} className="sl"><img src={b.image_url} alt={b.title || 'Promotion'} /></div>)}
      </div>
      {n > 1 && (
        <>
          <button className="arr l" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous">‹</button>
          <button className="arr r" onClick={() => setI((i + 1) % n)} aria-label="Next">›</button>
          <div className="dots">{items.map((b, k) => <button key={b.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'Slide ' + (k + 1)} />)}</div>
        </>
      )}
    </div>
  )
}
