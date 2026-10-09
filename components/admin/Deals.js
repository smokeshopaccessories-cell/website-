'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money } from '../../lib/cart'

export default function Deals() {
  const [rows, setRows] = useState([])
  const [num, setNum] = useState('')
  const [p, setP] = useState(null)
  const [f, setF] = useState({ retail_price: '', wholesale_price: '', ends_on: '', audience: 'both' })
  const [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('deals').select('*, products(item_number,name,retail_price,wholesale_price)').order('id', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])
  async function find() {
    const { data } = await supabase.from('products').select('id,item_number,name,retail_price,wholesale_price').eq('item_number', Number(num)).maybeSingle()
    setP(data); if (!data) setMsg('No product with that item number.')
  }
  async function add() {
    if (!p || !f.retail_price || !f.wholesale_price || !f.ends_on) { setMsg('Pick a product, both deal prices and an end date.'); return }
    const { error } = await supabase.from('deals').insert({ product_id: p.id, retail_price: Number(f.retail_price), wholesale_price: Number(f.wholesale_price), ends_on: f.ends_on, audience: f.audience })
    setMsg(error ? error.message : 'Deal added.'); if (!error) { setP(null); setNum(''); load() }
  }
  async function toggle(d) { await supabase.from('deals').update({ active: !d.active }).eq('id', d.id); load() }
  return (
    <>
      <div className="cd">
        <b>Add a deal</b>
        <div className="fm" style={{ marginTop: 8 }}>
          <div><label>Item number</label><input value={num} onChange={(e) => setNum(e.target.value)} /></div>
          <button className="btn" onClick={find}>Find</button>
        </div>
        {p && <p><b>{p.name}</b> · Retail {money(p.retail_price)} · Wholesale {money(p.wholesale_price)}</p>}
        <div className="fm">
          <div><label>Deal retail $</label><input type="number" step="0.01" value={f.retail_price} onChange={(e) => setF({ ...f, retail_price: e.target.value })} /></div>
          <div><label>Deal wholesale $</label><input type="number" step="0.01" value={f.wholesale_price} onChange={(e) => setF({ ...f, wholesale_price: e.target.value })} /></div>
          <div><label>Ends on</label><input type="date" value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></div>
          <div><label>Applies to</label><select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="both">Retail and wholesale</option><option value="retail">Retail only</option><option value="wholesale">Wholesale only</option></select></div>
          <button className="btn f" onClick={add}>Add deal</button>
        </div>
        {msg && <p className="note">{msg}</p>}
      </div>
      <div className="tw"><table><thead><tr><th>Product</th><th>Deal retail</th><th>Deal wholesale</th><th>Applies to</th><th>Ends</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map((d) => (
          <tr key={d.id}><td>#{d.products?.item_number} {d.products?.name}</td><td>{money(d.retail_price)} <small>was {money(d.products?.retail_price)}</small></td><td>{money(d.wholesale_price)} <small>was {money(d.products?.wholesale_price)}</small></td><td>{d.audience}</td><td>{d.ends_on}</td><td><span className={'tg ' + (d.active ? '' : 'b')}>{d.active ? 'Active' : 'Ended'}</span></td><td><button className="btn" onClick={() => toggle(d)}>{d.active ? 'End deal' : 'Reactivate'}</button></td></tr>
        ))}</tbody></table></div>
    </>
  )
}
