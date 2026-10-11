'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { getCart, money } from '../lib/cart'

export default function Header() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState({})
  const [n, setN] = useState(0)
  const [q, setQ] = useState('')
  const [sug, setSug] = useState([])
  const [showSug, setShowSug] = useState(false)
  const box = useRef(null)
  const [badge, setBadge] = useState(0)

  useEffect(() => {
    supabase.from('categories').select('id,name').eq('visible', true).order('sort').then(({ data }) => setCats(data || []))
  }, [])
  useEffect(() => {
    const f = () => setN(getCart().reduce((s, i) => s + i.qty, 0))
    f()
    window.addEventListener('cart', f)
    return () => window.removeEventListener('cart', f)
  }, [])
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setSug([]); return }
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc('catalog', { p_q: t, p_limit: 6, p_offset: 0 })
      setSug(data || []); setShowSug(true)
    }, 250)
    return () => clearTimeout(id)
  }, [q, user?.id])
  useEffect(() => {
    if (!user || !profile) { setBadge(0); return }
    const f = async () => {
      let a, b, c
      if (profile.role === 'admin') {
        a = await supabase.from('support_threads').select('id', { count: 'exact', head: true }).eq('admin_unread', true).eq('status', 'open')
        b = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'requested')
        c = await supabase.from('quotes').select('id', { count: 'exact', head: true }).in('status', ['pending', 'declined'])
      } else {
        a = await supabase.from('support_threads').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).eq('customer_unread', true)
        b = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).eq('status', 'quoted')
        c = await supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).in('status', ['countered', 'rejected'])
      }
      setBadge((a.count || 0) + (b.count || 0) + (c.count || 0))
    }
    f(); const t = setInterval(f, 45000)
    return () => clearInterval(t)
  }, [user?.id, profile?.role])
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setShowSug(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  async function loadBrands(id) {
    if (brands[id]) return
    const { data } = await supabase.rpc('brands', { p_category: id })
    setBrands((b) => ({ ...b, [id]: data || [] }))
  }
  const go = (text) => { setShowSug(false); router.push('/search?q=' + encodeURIComponent(text)) }

  return (
    <header>
      <div className="top">
        <Link href="/" aria-label="Smoke Shop Accessories home"><img className="logo" src="/logo.png" alt="Smoke Shop Accessories" /></Link>
        <div className="search" ref={box}>
          <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q.trim()) }}>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => sug.length && setShowSug(true)} onKeyDown={(e) => { if (e.key === 'Escape') setShowSug(false) }}
              placeholder="Search name, brand or UPC" aria-label="Search" autoComplete="off" />
          </form>
          {showSug && q.trim().length >= 2 && (
            <div className="sug" role="listbox">
              {sug.length === 0 && <div className="si mute">No matches yet. Press Enter to search.</div>}
              {sug.map((p) => (
                <button key={p.id} className="si" role="option" onClick={() => go(p.name)}>
                  {p.image_url ? <img src={p.image_url} alt="" /> : <span className="sp" />}
                  <span className="sn"><b>{p.name}</b><small>{p.brand || ''}</small></span>
                  <span className="spr">{p.status === 'sold' ? 'Sold' : p.price != null ? money(p.price) : ''}</span>
                </button>
              ))}
              {sug.length > 0 && <button className="si all" onClick={() => go(q.trim())}>See all results for “{q.trim()}” →</button>}
            </div>
          )}
        </div>
        {user ? (
          <>
            {profile?.role === 'admin' && <Link className="btn f" href="/admin">Admin{badge ? ' (' + badge + ')' : ''}</Link>}
            <Link className="btn" href="/account">My account{profile?.role !== 'admin' && badge ? ' (' + badge + ')' : ''}</Link>
            <button className="btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Log out</button>
          </>
        ) : (
          <>
            <Link className="btn" href="/login">Log in</Link>
            <Link className="btn" href="/signup">Sign up</Link>
          </>
        )}
        <Link className="btn f" href="/cart">Order request ({n})</Link>
      </div>
      <nav className="bar" aria-label="Categories">
        <ul>
          <li className="hot"><Link href="/#deals">Deals</Link></li>
          {cats.map((c) => (
            <li key={c.id} onMouseEnter={() => loadBrands(c.id)} onFocus={() => loadBrands(c.id)}>
              <Link href={'/category/' + c.id}>{c.name} ▾</Link>
              <div className="dd">
                <b>SHOP BY BRAND</b>
                {(brands[c.id] || []).map((b) => (
                  <Link key={b.brand} href={'/category/' + c.id + '?brand=' + encodeURIComponent(b.brand)}>{b.brand}</Link>
                ))}
                <Link href={'/category/' + c.id}><strong>View all →</strong></Link>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
