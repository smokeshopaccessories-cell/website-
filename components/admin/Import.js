'use client'
import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readFileRows, mapRows, TEMPLATE } from '../../lib/importer'

const FIELDS = ['item_number', 'name', 'description', 'category_id', 'brand', 'retail_price', 'wholesale_price', 'cost', 'upc', 'qty', 'hidden', 'mark_sold', 'image_url']
const NUMERIC = ['retail_price', 'wholesale_price', 'cost', 'qty', 'category_id', 'item_number']
const same = (k, a, b) => {
  const e = (v) => v === null || v === undefined || v === ''
  if (e(a) && e(b)) return true
  if (e(a) || e(b)) return false
  return NUMERIC.includes(k) ? Number(a) === Number(b) : String(a) === String(b)
}

export default function Import({ open, onClose, onDone, cats }) {
  const [step, setStep] = useState('pick')
  const [res, setRes] = useState(null)
  const [existing, setExisting] = useState({})
  const [opts, setOpts] = useState({ qty: true, prices: true, text: false, category: false, cost: false })
  const [err, setErr] = useState('')
  const [prog, setProg] = useState('')
  const [summary, setSummary] = useState(null)
  const ref = useRef(null)
  if (!open) return null

  function reset() { setStep('pick'); setRes(null); setErr(''); setSummary(null); setProg('') }
  function close() { reset(); onClose() }

  async function pick(file) {
    if (!file) return
    setErr('')
    try {
      const rows = await readFileRows(file)
      const r = mapRows(rows, cats)
      if (r.error) { setErr(r.error); return }
      const nums = r.rows.map((x) => x.item_number), map = {}
      for (let i = 0; i < nums.length; i += 300) {
        const { data, error } = await supabase.from('products').select('*').in('item_number', nums.slice(i, i + 300))
        if (error) throw error
        ;(data || []).forEach((p) => { map[p.item_number] = p })
      }
      setExisting(map); setRes(r); setStep('preview')
    } catch (e) { setErr(e.message || 'Could not read that file.') }
  }

  function plan() {
    const adds = [], updates = []
    let ws = 0
    for (const r of res.rows) {
      const ex = existing[r.item_number]
      if (!ex) {
        const n = { ...r }; delete n._has
        adds.push({ ...n, mark_sold: false, image_url: null })
        continue
      }
      const m = {}
      FIELDS.forEach((k) => { m[k] = ex[k] === undefined ? null : ex[k] })
      if (opts.qty && r._has.qty) m.qty = r.qty
      if (opts.qty && r._has.upc && !ex.upc) m.upc = r.upc
      if (opts.prices) { if (r._has.retail) m.retail_price = r.retail_price; if (r._has.wholesale) m.wholesale_price = r.wholesale_price }
      if (opts.text) { m.name = r.name; m.description = r.description }
      if (opts.category) { m.category_id = r.category_id; m.brand = r.brand }
      if (opts.cost && r._has.cost) m.cost = r.cost
      if (FIELDS.some((k) => !same(k, ex[k], m[k]))) {
        updates.push(m)
        if (!same('wholesale_price', ex.wholesale_price, m.wholesale_price)) ws++
      }
    }
    return { adds, updates, unchanged: res.rows.length - adds.length - updates.length, ws }
  }

  async function run() {
    const P = plan()
    const all = [...P.adds, ...P.updates]
    setStep('working')
    let done = 0
    let failure = ''
    for (let i = 0; i < all.length; i += 150) {
      const chunk = all.slice(i, i + 150)
      const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'item_number' })
      if (error) { failure = error.message; break }
      done += chunk.length
      setProg(done + ' of ' + all.length)
    }
    setSummary({ added: Math.min(done, P.adds.length), updated: Math.max(0, done - P.adds.length), failure, total: all.length })
    setStep('done'); onDone()
  }

  const P = step === 'preview' ? plan() : null
  const setO = (k) => (e) => setOpts({ ...opts, [k]: e.target.checked })

  return (
    <div className="ov c" onClick={(e) => { if (e.target === e.currentTarget && step !== 'working') close() }}>
      <div className="md big" role="dialog" aria-modal="true" aria-label="Import products">
        <h2>Import products</h2>

        {step === 'pick' && (
          <>
            <p>Choose your POS export (<b>.xlsx</b>) or a <b>.csv</b> file. You will see a preview before anything changes. Nothing is ever deleted by an import.</p>
            <p className="mute"><small>Columns used: Item Number, Item Name, Item Description, Department Name (or Category), Regular Price (retail), Custom Price 3 (wholesale), Average Unit Cost (optional), UPC, Qty 1.</small></p>
            <div className="row"><button className="btn f" onClick={() => ref.current.click()}>Choose file</button>
              <a className="btn" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(TEMPLATE)} download="products-template.csv">Download CSV template</a>
              <button className="btn" onClick={close}>Cancel</button></div>
            <input ref={ref} type="file" accept=".xlsx,.csv,.txt" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
            {err && <p className="err">{err}</p>}
          </>
        )}

        {step === 'preview' && P && (
          <>
            <div className="fm" style={{ margin: '8px 0' }}>
              <div className="cd" style={{ margin: 0 }}><b>{P.adds.length}</b><br /><small>new products</small></div>
              <div className="cd" style={{ margin: 0 }}><b>{P.updates.length}</b><br /><small>existing products will change</small></div>
              <div className="cd" style={{ margin: 0 }}><b>{P.unchanged}</b><br /><small>no change needed</small></div>
              <div className="cd" style={{ margin: 0 }}><b>{res.skipped}</b><br /><small>rows skipped</small></div>
            </div>
            <p><b>For products that already exist, update:</b></p>
            <div className="fm">
              <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={opts.qty} onChange={setO('qty')} /> Quantity</label>
              <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={opts.prices} onChange={setO('prices')} /> Retail and wholesale prices</label>
              <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={opts.text} onChange={setO('text')} /> Names and descriptions</label>
              <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={opts.category} onChange={setO('category')} /> Category and brand</label>
              <label style={{ fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={opts.cost} onChange={setO('cost')} /> Cost</label>
            </div>
            <p className="mute"><small>Photos, hidden and sold settings are never changed by an import. New products are added with prices, quantity and a category worked out from the department and name; products in hidden categories are added hidden.</small></p>
            {P.ws > 0 && <p className="warn" style={{ padding: 10 }}>{P.ws} wholesale prices will change. Customers' saved prices on those items will reset to the new standard price.</p>}
            {res.warnings.length > 0 && (
              <div className="note"><b>{res.warnings.length} things to check:</b>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{res.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}</ul>
                {res.warnings.length > 8 && <small>…and {res.warnings.length - 8} more.</small>}
              </div>
            )}
            <div className="row">
              <button className="btn f" disabled={P.adds.length + P.updates.length === 0} onClick={run}>Import {P.adds.length + P.updates.length} changes</button>
              <button className="btn" onClick={reset}>Choose a different file</button><button className="btn" onClick={close}>Cancel</button>
            </div>
          </>
        )}

        {step === 'working' && <p className="note">Importing… {prog} <br /><small>Please keep this window open.</small></p>}

        {step === 'done' && summary && (
          <>
            {summary.failure
              ? <p className="err">The import stopped part-way: {summary.failure}. {summary.added + summary.updated} of {summary.total} changes were saved. You can run the import again; saved rows will show as "no change needed."</p>
              : <p className="note"><b>Done.</b> {summary.added} products added, {summary.updated} updated.</p>}
            <div className="row"><button className="btn f" onClick={close}>Close</button></div>
          </>
        )}
      </div>
    </div>
  )
}
