'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money } from '../../lib/cart'

function Req({ r, reload, setMsg }) {
  const [price, setPrice] = useState(r.asked_price)
  const [ends, setEnds] = useState('')
  const [reply, setReply] = useState('')
  async function decide(approve) {
    const { error } = await supabase.rpc('decide_price_request', { rid: r.id, approve, p_price: approve ? Number(price) : null, p_reply: reply || null, p_ends: ends || null })
    setMsg(error ? error.message : approve ? 'Approved. The customer will see this price on their next visit.' : 'Declined.'); if (!error) reload()
  }
  const c = r.profiles || {}
  return (
    <div className="cd">
      <div className="ln"><b>#{r.products?.item_number} {r.products?.name}</b><span className={'tg ' + (r.status === 'approved' ? '' : r.status === 'declined' ? 'b' : 'w')}>{r.status}</span></div>
      <p className="mute">{c.business_name || c.full_name} · Standard wholesale {money(r.products?.wholesale_price)} · They ask for <b>{money(r.asked_price)}</b>{r.note ? ' · “' + r.note + '”' : ''}</p>
      {r.status === 'pending' ? (
        <div className="fm">
          <div><label>Price for this customer ($)</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div><label>Valid until (optional)</label><input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
          <div style={{ flex: 2 }}><label>Reply to customer</label><input value={reply} onChange={(e) => setReply(e.target.value)} /></div>
          <button className="btn f" onClick={() => decide(true)}>Approve price</button><button className="btn d" onClick={() => decide(false)}>Decline</button>
        </div>
      ) : <p>{r.approved_price ? 'Approved at ' + money(r.approved_price) + '. ' : ''}{r.reply}</p>}
    </div>
  )
}

export default function PriceRequests() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const load = async () => {
    const { data } = await supabase.from('price_requests').select('*, products(item_number,name,wholesale_price), profiles(full_name,business_name)').order('id', { ascending: false }).limit(100)
    setRows((data || []).sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)))
  }
  useEffect(() => { load() }, [])
  return (
    <>
      <p className="mute">If you later change a product's standard wholesale price, saved prices for that product reset to the new standard price.</p>
      {msg && <p className="note">{msg}</p>}
      {rows.length === 0 && <p className="mute">No price requests.</p>}
      {rows.map((r) => <Req key={r.id + r.status} r={r} reload={load} setMsg={setMsg} />)}
    </>
  )
}
