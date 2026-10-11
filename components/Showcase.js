'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/cart'
import { useAuth } from '../lib/useAuth'
import QuickView from './QuickView'

// Auto-scrolling strip of products. Pass `products`, or a `categoryId` to load them.
// Clicking a product opens the quick view pop-up, where the customer can pick a quantity and add it.
export default function Showcase({ title, categoryId, products, link, linkText = 'View all', variant }) {
  const { user, profile } = useAuth()
  const [fetched, setFetched] = useState([])
  const [sel, setSel] = useState(null)

  useEffect(() => {
    if (products || !categoryId) return
    supabase.rpc('catalog', { p_category: categoryId, p_limit: 16, p_offset: 0 }).then(({ data }) => setFetched(data || []))
  }, [categoryId, user?.id, products])

  const ok = (products || fetched).filter((p) => p.status !== 'sold')
  const items = [...ok.filter((p) => p.image_url), ...ok.filter((p) => !p.image_url)].slice(0, 14)
  if (items.length < 3) return null
  const loop = [...items, ...items]

  return (
    <section className={'show' + (variant === 'deal' ? ' deal' : '')} aria-label={title}>
      <div className="shh"><span>★ {title}</span>{link && <Link href={link}>{linkText} →</Link>}</div>
      <div className="trk" style={{ animationDuration: Math.max(30, items.length * 5) + 's' }}>
        {loop.map((p, k) => {
          const dup = k >= items.length
          return (
            <button key={k} className="shi" onClick={() => setSel(p)} aria-hidden={dup ? 'true' : undefined} tabIndex={dup ? -1 : undefined} aria-label={dup ? undefined : 'View ' + p.name}>
              {p.on_deal && <span className="bd d">DEAL</span>}
              {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <span className="sp0">{p.brand || 'Photo'}</span>}
              <b>{p.name}</b>
              <small>{p.price != null ? money(p.price) : 'Log in for price'}</small>
              <span className="go">View &amp; add</span>
            </button>
          )
        })}
      </div>
      {sel && <QuickView p={sel} user={user} profile={profile} onClose={() => setSel(null)} />}
    </section>
  )
}
