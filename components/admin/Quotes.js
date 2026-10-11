'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money } from '../../lib/cart'
import { adminMessage } from '../../lib/support'

const FILTERS = [
  ['attention', 'Needs your reply'],
  ['countered', 'Waiting on customer'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
]

function Quote({ q, reload, setMsg }) {
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [minQty, setMinQty] = useState(q.min_qty_applies || q.qty)
  const [busy, setBusy] = useState(false)
  const c = q.profiles || {}
  const name = q.products?.name || 'item'
  const open = q.status === 'pending' || q.status === 'declined'

  async function act(action, text) {
    setBusy(true)
    const { error } = await supabase.rpc('quote_admin_respond', {
      p_quote: q.id, p_action: action, p_price: action === 'counter' ? Number(price) : null, p_note: note || null, p_min_qty: Number(minQty) || q.qty,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    await adminMessage(q.customer_id, 'price', 'Price quote', text)
    setMsg('Saved and the customer was notified.')
    reload()
  }
  const accept = () => act('accept', 'Good news! We accepted your price of ' + money(q.customer_price) + ' each for ' + name + ' (' + minQty + '+ pieces). It is saved on your account and will show on your future orders.')
  const counter = () => {
    if (!(Number(price) > 0)) { setMsg('Enter your price first.'); return }
    act('counter', 'About ' + name + ': we can do ' + money(price) + ' each when you order ' + minQty + ' or more. Open your cart or My account to accept it, decline it, or send us a different price.')
  }
  const reject = () => act('reject', 'About ' + name + ': we could not match that price this time' + (note ? ' (' + note + ')' : '') + '. You are welcome to send us a different price in your cart or My account.')

  return (
    <div className={'cd'} style={q.status === 'declined' ? { borderColor: 'var(--bad)' } : undefined}>
      <div className="ln">
        <b>#{q.products?.item_number} {name} · {q.qty} pcs</b>
        <span>{q.status === 'declined' && <span className="tg b">Customer declined</span>} <span className={'tg ' + (q.status === 'accepted' ? '' : q.status === 'rejected' || q.status === 'declined' ? 'b' : 'w')}>{q.status}</span></span>
      </div>
      <p className="mute">{c.business_name || c.full_name} ({c.role || ''}) · {c.email} · Their regular price <b>{money(q.list_price)}</b> each · {new Date(q.created_at).toLocaleDateString()}</p>
      {q.quote_offers.map((o) => (
        <div className="ln" key={o.id} style={{ padding: '4px 0' }}>
          <small><b>{o.actor === 'customer' ? 'Customer' : 'You'}</b> {{ offer: 'asked for', counter: 'offered', accept: 'accepted', reject: 'rejected', decline: 'declined' }[o.action]}{o.price != null ? ' ' + money(o.price) + ' each' : ''}{o.note ? ' · “' + o.note + '”' : ''}</small>
          <small className="mute">{new Date(o.created_at).toLocaleString()}</small>
        </div>
      ))}
      {q.status === 'accepted' && <p className="note">Agreed at {money(q.final_price)} each from {q.min_qty_applies || q.qty}+ pieces. Saved on the customer's account.</p>}
      {open && (
        <div className="fm" style={{ marginTop: 10 }}>
          <div style={{ maxWidth: 150 }}><label>Your price each ($)</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={q.customer_price ? 'More than ' + q.customer_price : ''} /></div>
          <div style={{ maxWidth: 150 }}><label>Applies from qty</label><input type="number" min="1" value={minQty} onChange={(e) => setMinQty(e.target.value)} /></div>
          <div style={{ flex: 2 }}><label>Note to customer (optional)</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button className="btn f" disabled={busy} onClick={counter}>Send my price</button>
          {q.status === 'pending' && <button className="btn f" disabled={busy} onClick={accept}>Accept their {money(q.customer_price)}</button>}
          <button className="btn d" disabled={busy} onClick={reject}>Reject</button>
        </div>
      )}
    </div>
  )
}

function Negotiations({ setMsg }) {
  const [rows, setRows] = useState([])
  const [f, setF] = useState('attention')
  const load = async () => {
    let q = supabase.from('quotes').select('*, products(item_number,name), profiles(full_name,business_name,email,role), quote_offers(id,actor,action,price,note,created_at)').order('updated_at', { ascending: false }).limit(100)
    if (f === 'attention') q = q.in('status', ['pending', 'declined'])
    else if (f !== 'all') q = q.eq('status', f)
    const { data } = await q
    setRows((data || []).map((x) => ({ ...x, quote_offers: (x.quote_offers || []).sort((a, b) => a.id - b.id) })))
  }
  useEffect(() => { load() }, [f])
  return (
    <>
      <div className="fm"><div><select value={f} onChange={(e) => setF(e.target.value)} aria-label="Filter">{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
      <p className="mute">Customers only see the price box after they add enough pieces (see Rules). You can accept their price, send your own, or reject. If a customer declines your price you will see it here in red, and they can send a new price (never the same amount twice).</p>
      {rows.length === 0 && <p className="mute">Nothing here.</p>}
      {rows.map((q) => <Quote key={q.id + q.status + q.updated_at} q={q} reload={load} setMsg={setMsg} />)}
    </>
  )
}

function Rules({ setMsg }) {
  const [rules, setRules] = useState([])
  useEffect(() => { supabase.from('quote_rules').select('*').order('min_price').then(({ data }) => setRules((data || []).map((r) => ({ min_price: r.min_price, max_price: r.max_price ?? '', min_qty: r.min_qty })))) }, [])
  const set = (k, key, v) => setRules(rules.map((r, i) => (i === k ? { ...r, [key]: v } : r)))
  async function save() {
    const { error } = await supabase.rpc('quote_save_rules', { p_rules: rules.map((r) => ({ min_price: Number(r.min_price) || 0, max_price: r.max_price === '' ? null : Number(r.max_price), min_qty: Number(r.min_qty) || 1 })) })
    setMsg(error ? error.message : 'Rules saved.')
  }
  return (
    <>
      <p className="mute">A customer who has quoting turned on only sees the “ask for a better price” box on an item once they have added at least this many pieces of it. Pick the item price range, then the number of pieces. Below that, nothing shows.</p>
      {rules.map((r, k) => (
        <div className="fm" key={k} style={{ marginBottom: 8 }}>
          <div><label>Item price from ($)</label><input type="number" step="0.01" value={r.min_price} onChange={(e) => set(k, 'min_price', e.target.value)} /></div>
          <div><label>up to, not including ($, blank = no limit)</label><input type="number" step="0.01" value={r.max_price} onChange={(e) => set(k, 'max_price', e.target.value)} /></div>
          <div><label>Pieces needed</label><input type="number" min="1" value={r.min_qty} onChange={(e) => set(k, 'min_qty', e.target.value)} /></div>
          <button className="btn d" onClick={() => setRules(rules.filter((_, i) => i !== k))}>Remove</button>
        </div>
      ))}
      <div className="row"><button className="btn" onClick={() => setRules([...rules, { min_price: '', max_price: '', min_qty: 10 }])}>Add a range</button><button className="btn f" onClick={save}>Save rules</button></div>
      <p className="mute"><small>An item whose price is not covered by any range never shows the box.</small></p>
    </>
  )
}

function Saved({ setMsg }) {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const load = async () => {
    const { data } = await supabase.from('customer_prices').select('*, products(item_number,name,retail_price,wholesale_price), profiles(full_name,business_name,email,role)').order('id', { ascending: false }).limit(300)
    setRows(data || [])
  }
  useEffect(() => { load() }, [])
  const shown = rows.filter((r) => !q || ((r.profiles?.business_name || '') + (r.profiles?.full_name || '') + (r.profiles?.email || '') + (r.products?.name || '')).toLowerCase().includes(q.toLowerCase()))
  async function remove(r) {
    if (!confirm('Remove this saved price? The customer goes back to the normal price.')) return
    const { error } = await supabase.rpc('quote_delete_saved_price', { p_id: r.id })
    setMsg(error ? error.message : 'Removed.'); load()
  }
  return (
    <>
      <p className="mute">Prices you agreed with customers. They see these on future orders. If you later lower the normal price below a saved price, the lower normal price is used.</p>
      <div className="fm"><div style={{ flex: 3 }}><input placeholder="Search customer or item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div></div>
      <div className="tw"><table><thead><tr><th>Customer</th><th>Item</th><th>Saved price</th><th>From qty</th><th>Saved on</th><th /></tr></thead>
        <tbody>{shown.map((r) => (
          <tr key={r.id}><td><b>{r.profiles?.business_name || r.profiles?.full_name}</b><br /><small>{r.profiles?.email}</small></td><td>#{r.products?.item_number} {r.products?.name}</td><td><b>{money(r.price)}</b></td><td>{r.min_qty}+</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><button className="btn d" onClick={() => remove(r)}>Remove</button></td></tr>
        ))}</tbody></table></div>
      {shown.length === 0 && <p className="mute">No saved prices yet.</p>}
    </>
  )
}

export default function Quotes() {
  const [tab, setTab] = useState('neg')
  const [msg, setMsg] = useState('')
  const T = [['neg', 'Price quotes'], ['rules', 'Rules'], ['saved', 'Saved customer prices']]
  return (
    <>
      <div className="fm" style={{ marginBottom: 10 }}><div>{T.map(([k, l]) => <button key={k} className={'btn' + (tab === k ? ' f' : '')} onClick={() => { setTab(k); setMsg('') }}>{l}</button>)}</div></div>
      <p className="mute"><small>Who can quote: wholesale customers always can. Retail customers only when you turn it on for them in the Customers tab.</small></p>
      {msg && <p className="note">{msg}</p>}
      {tab === 'neg' && <Negotiations setMsg={setMsg} />}
      {tab === 'rules' && <Rules setMsg={setMsg} />}
      {tab === 'saved' && <Saved setMsg={setMsg} />}
    </>
  )
}
