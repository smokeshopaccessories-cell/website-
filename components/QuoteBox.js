'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/cart'
import { reloadSavedPrices } from '../lib/quotes'

const STATUS = {
  pending: ['Waiting for the store', 'w'],
  countered: ['Store sent a price', 'w'],
  accepted: ['Price agreed', ''],
  declined: ['You declined', 'b'],
  rejected: ['Store could not match', 'b'],
}

function History({ q }) {
  return (
    <div style={{ marginTop: 6 }}>
      {q.quote_offers.map((o) => (
        <div className="ln" key={o.id} style={{ padding: '4px 0' }}>
          <small>
            <b>{o.actor === 'customer' ? 'You' : 'Store'}</b>{' '}
            {{ offer: 'asked for', counter: 'offered', accept: 'accepted', reject: 'could not do', decline: 'declined' }[o.action] || o.action}
            {o.price != null ? ' ' + money(o.price) + ' each' : ''}
            {o.note ? ' · “' + o.note + '”' : ''}
          </small>
          <small className="mute">{new Date(o.created_at).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  )
}

// Form to send a first quote request (from the cart) or a new price (inside an existing quote).
function PriceForm({ label, button, onSend, busy, err }) {
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  return (
    <div className="fm" style={{ marginTop: 8 }}>
      <div style={{ maxWidth: 170 }}>
        <label>{label}</label>
        <input aria-label={label} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ each" />
      </div>
      <div style={{ flex: 2 }}>
        <label>Note (optional)</label>
        <input aria-label="Note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: I can get it for less elsewhere" />
      </div>
      <button className="btn f" disabled={busy || !(Number(price) > 0)} onClick={() => onSend(Number(price), note)}>{busy ? 'Sending…' : button}</button>
      {err && <p className="err" style={{ flexBasis: '100%' }}>{err}</p>}
    </div>
  )
}

// One negotiation with the store: shows the history and whatever the customer can do next.
export function QuoteThread({ q, reload }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [again, setAgain] = useState(false)
  const [label, tone] = STATUS[q.status] || [q.status, '']
  const mine = q.quote_offers.filter((o) => o.actor === 'customer' && o.price != null).map((o) => Number(o.price))

  async function run(fn) {
    setBusy(true); setErr('')
    const { error } = await fn()
    setBusy(false)
    if (error) { setErr(error.message); return }
    setAgain(false); reloadSavedPrices(); reload()
  }
  const respond = (accept) => run(() => supabase.rpc('quote_respond', { p_quote: q.id, p_accept: accept }))
  const requote = (price, note) => {
    if (mine.includes(Math.round(price * 100) / 100)) { setErr('You already asked for that price. Please send a different amount.'); return }
    run(() => supabase.rpc('quote_requote', { p_quote: q.id, p_price: price, p_note: note || null }))
  }

  return (
    <div className="ask" style={{ marginTop: 8 }}>
      <div className="ln" style={{ border: 0, padding: 0 }}>
        <span><b>Your price request</b>{q.products?.name ? <> · {q.products.name}</> : null} · {q.qty} pcs · Current price {money(q.list_price)} each</span>
        <span className={'tg ' + tone}>{label}</span>
      </div>
      <History q={q} />

      {q.status === 'pending' && <p className="mute"><small>We will review it and reply here. Nothing is charged.</small></p>}

      {q.status === 'countered' && (
        <>
          <p className="note" style={{ marginTop: 8 }}>The store can do <b>{money(q.store_price)} each</b>{q.min_qty_applies ? ' when you order ' + q.min_qty_applies + ' or more' : ''}.</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn f" disabled={busy} onClick={() => respond(true)}>Accept {money(q.store_price)}</button>
            <button className="btn d" disabled={busy} onClick={() => respond(false)}>Decline</button>
            <button className="btn" disabled={busy} onClick={() => setAgain(!again)}>Ask for a different price</button>
          </div>
        </>
      )}

      {(q.status === 'declined' || q.status === 'rejected') && !again && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn f" onClick={() => setAgain(true)}>Send a new price</button>
        </div>
      )}

      {again && <PriceForm label="New price each ($)" button="Send new price" busy={busy} err={err} onSend={requote} />}
      {!again && err && <p className="err">{err}</p>}
      {q.status === 'accepted' && <p className="note" style={{ marginTop: 8 }}>Agreed at <b>{money(q.final_price)} each</b>{q.min_qty_applies ? ' for ' + q.min_qty_applies + '+ pieces' : ''}. This price is saved on your account for future orders.</p>}
      {(q.status === 'declined' || q.status === 'rejected') && mine.length > 0 && <p className="mute"><small>Prices you already asked for: {[...new Set(mine)].map(money).join(', ')}. Your next price must be different.</small></p>}
    </div>
  )
}

// Shown on a cart line. Appears only when quoting is on for this customer AND they ordered enough pieces.
export default function QuoteBox({ item, listPrice, quote, eligible, reload }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (quote) return <QuoteThread q={quote} reload={reload} />
  if (!eligible) return null

  async function send(price, note) {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('quote_submit', { p_product: String(item.id), p_qty: item.qty, p_price: price, p_list: listPrice, p_note: note || null })
    setBusy(false)
    if (error) { setErr(error.message); return }
    reload()
  }
  return (
    <div className="ask" style={{ marginTop: 8 }}>
      <b>Ordering {item.qty}? Ask for a better price.</b>
      <p className="mute" style={{ margin: '2px 0 0' }}><small>Current price is {money(listPrice)} each. Tell us the price you want. We reply here, and if we agree, the price is saved for your future orders.</small></p>
      <PriceForm label="Your price each ($)" button="Send price request" busy={busy} err={err} onSend={send} />
    </div>
  )
}
