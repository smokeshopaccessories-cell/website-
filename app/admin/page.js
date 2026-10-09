'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '../../lib/useAuth'
import Products from '../../components/admin/Products'
import Wholesale from '../../components/admin/Wholesale'
import Orders from '../../components/admin/Orders'
import PriceRequests from '../../components/admin/PriceRequests'
import Deals from '../../components/admin/Deals'
import Customers from '../../components/admin/Customers'
import Settings from '../../components/admin/Settings'

const TABS = [['products', 'Inventory', Products], ['wholesale', 'Wholesale requests', Wholesale], ['requests', 'Price requests', PriceRequests], ['deals', 'Deals', Deals], ['orders', 'Orders', Orders], ['customers', 'Customers', Customers], ['settings', 'Shipping', Settings]]

export default function Admin() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState('products')
  if (loading) return <p className="mute">Loading…</p>
  if (!user || profile?.role !== 'admin') return <div className="card"><h2>Admin only</h2><p>Please log in with your admin account.</p><Link className="btn f" href="/login">Log in</Link></div>
  const Active = TABS.find((t) => t[0] === tab)[2]
  return (
    <>
      <div className="ph"><h1>Admin</h1></div>
      <div className="tabs">{TABS.map((t) => <button key={t[0]} className={tab === t[0] ? 'on' : ''} onClick={() => setTab(t[0])}>{t[1]}</button>)}</div>
      <Active />
    </>
  )
}
