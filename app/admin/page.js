'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import Products from '../../components/admin/Products'
import Wholesale from '../../components/admin/Wholesale'
import Orders from '../../components/admin/Orders'
import PriceRequests from '../../components/admin/PriceRequests'
import Deals from '../../components/admin/Deals'
import Customers from '../../components/admin/Customers'
import Settings from '../../components/admin/Settings'
import Banners from '../../components/admin/Banners'
import Support from '../../components/admin/Support'
import Security from '../../components/admin/Security'

const TABS = [['orders', 'Orders', Orders], ['support', 'Support', Support], ['products', 'Inventory', Products], ['wholesale', 'Wholesale requests', Wholesale], ['requests', 'Price requests', PriceRequests], ['deals', 'Deals', Deals], ['customers', 'Customers', Customers], ['banners', 'Banners & brands', Banners], ['settings', 'Shipping', Settings], ['security', 'Security', Security]]

export default function Admin() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState('orders')
  const [counts, setCounts] = useState({})
  const isAdmin = !!user && profile?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    const f = async () => {
      const a = await supabase.from('support_threads').select('id', { count: 'exact', head: true }).eq('admin_unread', true).eq('status', 'open')
      const b = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'requested')
      const c = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'wholesale').eq('status', 'pending')
      setCounts({ support: a.count || 0, orders: b.count || 0, wholesale: c.count || 0 })
    }
    f(); const t = setInterval(f, 30000)
    return () => clearInterval(t)
  }, [isAdmin, tab])

  if (loading) return <p className="mute">Loading…</p>
  if (!isAdmin) return <div className="card"><h2>Admin only</h2><p>Please log in with your admin account.</p><Link className="btn f" href="/login">Log in</Link></div>
  const Active = TABS.find((t) => t[0] === tab)[2]
  return (
    <>
      <div className="ph"><h1>Admin</h1></div>
      <div className="tabs">{TABS.map((t) => <button key={t[0]} className={tab === t[0] ? 'on' : ''} onClick={() => setTab(t[0])}>{t[1]}{counts[t[0]] ? ' (' + counts[t[0]] + ')' : ''}</button>)}</div>
      <Active />
    </>
  )
}
