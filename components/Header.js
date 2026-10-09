'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { getCart } from '../lib/cart'

export default function Header() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState({})
  const [n, setN] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    supabase.from('categories').select('id,name').eq('visible', true).order('sort').then(({ data }) => setCats(data || []))
  }, [])
  useEffect(() => {
    const f = () => setN(getCart().reduce((s, i) => s + i.qty, 0))
    f()
    window.addEventListener('cart', f)
    return () => window.removeEventListener('cart', f)
  }, [])

  async function loadBrands(id) {
    if (brands[id]) return
    const { data } = await supabase.rpc('brands', { p_category: id })
    setBrands((b) => ({ ...b, [id]: data || [] }))
  }

  return (
    <header>
      <div className="top">
        <Link href="/" className="brand" aria-label="Smoke Shop Accessories home">
          <svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#9ad8a6" /><path d="M12 35c0-13 9-21 24-21 0 14-8 22-20 22-2 0-4 0-4-1zm4-2c5-8 10-12 16-15-6 5-10 9-13 16z" fill="#fff" opacity=".92" /></svg>
          <span className="bn">Smoke Shop<br />Accessories</span>
        </Link>
        <form className="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push('/search?q=' + encodeURIComponent(q.trim())) }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand or UPC" aria-label="Search" />
        </form>
        {user ? (
          <>
            {profile?.role === 'admin' && <Link className="btn" href="/admin">Admin</Link>}
            <Link className="btn" href="/account">My account</Link>
            <button className="btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Log out</button>
          </>
        ) : (
          <>
            <Link className="btn" href="/login">Log in</Link>
            <Link className="btn f" href="/signup">Sign up</Link>
          </>
        )}
        <Link className="btn f" href="/cart">Order request ({n})</Link>
      </div>
      <nav className="cats" aria-label="Categories">
        <ul>
          {cats.map((c) => (
            <li key={c.id} onMouseEnter={() => loadBrands(c.id)} onFocus={() => loadBrands(c.id)}>
              <Link href={'/category/' + c.id}>{c.name} ▾</Link>
              <div className="dd">
                <b>SHOP BY BRAND</b>
                {(brands[c.id] || []).map((b) => (
                  <Link key={b.brand} href={'/category/' + c.id + '?brand=' + encodeURIComponent(b.brand)}>{b.brand}</Link>
                ))}
                <Link href={'/category/' + c.id}><strong>View all</strong></Link>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
