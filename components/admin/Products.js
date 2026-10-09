'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const PS = 30
const blank = { name: '', description: '', category_id: '', brand: '', retail_price: 0, wholesale_price: 0, cost: '', upc: '', qty: 0, hidden: false, mark_sold: false, image_url: '' }

async function upload(file) {
  if (!file || !file.type.startsWith('image/')) return { error: 'Please choose an image file.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Image is over 5 MB.' }
  const path = Date.now() + '-' + file.name.replace(/[^a-z0-9.]/gi, '_')
  const { error } = await supabase.storage.from('product-images').upload(path, file)
  if (error) return { error: error.message }
  return { url: supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl }
}

export default function Products() {
  const [rows, setRows] = useState([])
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [flt, setFlt] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState('')
  const [drag, setDrag] = useState(false)
  const [link, setLink] = useState('')
  const fileRef = useRef(null)
  const bulkRef = useRef(null)

  const load = useCallback(async () => {
    let query = supabase.from('products').select('*', { count: 'exact' }).order('item_number').range(page * PS, page * PS + PS - 1)
    const s = q.trim().replace(/[%,()*]/g, '')
    if (s) query = query.or('name.ilike.%' + s + '%,description.ilike.%' + s + '%,upc.eq.' + s + (/^\d+$/.test(s) && s.length < 9 ? ',item_number.eq.' + s : ''))
    if (cat) query = query.eq('category_id', cat)
    if (flt === 'problem') query = query.eq('price_problem', true)
    if (flt === 'sold') query = query.or('mark_sold.eq.true,qty.lte.0')
    if (flt === 'hidden') query = query.eq('hidden', true)
    const { data, count } = await query
    setRows(data || []); setTotal(count || 0)
  }, [q, cat, flt, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { supabase.from('categories').select('id,name').order('sort').then(({ data }) => setCats(data || [])) }, [])

  const catName = (id) => cats.find((c) => c.id === id)?.name || ''
  const status = (p) => (p.hidden ? ['Hidden', 'w'] : p.mark_sold || p.price_problem || p.qty <= 0 ? ['Sold', 'b'] : p.qty <= 5 ? ['Low stock', 'w'] : ['In stock', ''])

  async function pick(file) {
    const r = await upload(file)
    if (r.error) setMsg(r.error); else setF((x) => ({ ...x, image_url: r.url }))
  }
  function useLink() {
    if (!/^https?:\/\//i.test(link.trim())) { setMsg('Paste a full image link starting with https://'); return }
    const im = new Image()
    im.onload = () => { setF((x) => ({ ...x, image_url: link.trim() })); setLink('') }
    im.onerror = () => setMsg('That link did not load as an image. Try the direct image address.')
    im.src = link.trim()
  }
  async function save() {
    if (!f.name.trim()) { setMsg('Name is required.'); return }
    const body = {
      name: f.name.trim(), description: f.description || null, category_id: f.category_id ? Number(f.category_id) : null, brand: f.brand || null,
      retail_price: Number(f.retail_price) || 0, wholesale_price: Number(f.wholesale_price) || 0, cost: f.cost === '' || f.cost == null ? null : Number(f.cost),
      upc: f.upc || null, qty: parseInt(f.qty) || 0, hidden: !!f.hidden, mark_sold: !!f.mark_sold, image_url: f.image_url || null,
    }
    let error
    if (f.id) ({ error } = await supabase.from('products').update(body).eq('id', f.id))
    else {
      const { data } = await supabase.from('products').select('item_number').order('item_number', { ascending: false }).limit(1)
      ;({ error } = await supabase.from('products').insert({ ...body, item_number: (data?.[0]?.item_number || 0) + 1 }))
    }
    if (error) { setMsg(error.message); return }
    setF(null); setMsg('Saved.'); load()
  }
  async function remove() {
    if (!confirm('Delete this product permanently? Consider hiding it instead.')) return
    const { error } = await supabase.from('products').delete().eq('id', f.id)
    if (error) setMsg(error.message); else { setF(null); load() }
  }
  async function bulk(files) {
    const arr = [...files]; let ok = 0; const bad = []
    for (const file of arr) {
      const k = file.name.replace(/\.[^.]+$/, '').trim()
      const { data } = await supabase.from('products').select('id').or('upc.eq.' + k + (/^\d+$/.test(k) && k.length < 9 ? ',item_number.eq.' + k : '')).limit(1)
      if (!data?.[0]) { bad.push(file.name); continue }
      const r = await upload(file)
      if (r.error) { bad.push(file.name); continue }
      await supabase.from('products').update({ image_url: r.url }).eq('id', data[0].id)
      ok++; setMsg('Uploaded ' + ok + ' of ' + arr.length + '…')
    }
    setMsg('Matched ' + ok + ' of ' + arr.length + ' photos.' + (bad.length ? ' Not matched: ' + bad.slice(0, 8).join(', ') : '')); load()
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <>
      <div className="fm">
        <div style={{ flex: 3 }}><input placeholder="Search name, item number or UPC" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} aria-label="Search" /></div>
        <div><select value={cat} onChange={(e) => { setCat(e.target.value); setPage(0) }} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><select value={flt} onChange={(e) => { setFlt(e.target.value); setPage(0) }} aria-label="Filter"><option value="">All items</option><option value="problem">Price problems</option><option value="sold">Sold or out of stock</option><option value="hidden">Hidden</option></select></div>
        <button className="btn" onClick={() => bulkRef.current.click()}>Bulk photos</button>
        <button className="btn f" onClick={() => { setF({ ...blank }); setMsg('') }}>Add product</button>
        <input ref={bulkRef} type="file" multiple accept="image/*" hidden onChange={(e) => bulk(e.target.files)} />
      </div>
      <p className="mute">Bulk photos: name each file with the product's UPC or item number (for example 0008660007315.jpg). {total} products.</p>
      {msg && !f && <p className="note">{msg}</p>}
      <div className="tw"><table>
        <thead><tr><th>No.</th><th>Product</th><th>Category</th><th>Retail</th><th>Wholesale</th><th>Cost</th><th>Qty</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map((p) => {
          const s = status(p)
          return (
            <tr key={p.id}>
              <td>{p.item_number}</td>
              <td><div className="row" style={{ margin: 0, flexWrap: 'nowrap' }}>{p.image_url ? <img className="th" src={p.image_url} alt="" /> : <span className="th" />}<span><b>{p.name}</b><br /><small>{p.description}{p.upc ? ' · ' + p.upc : ''}</small></span></div></td>
              <td>{catName(p.category_id)}</td><td>${Number(p.retail_price).toFixed(2)}</td><td>${Number(p.wholesale_price).toFixed(2)}</td><td>{p.cost != null ? '$' + Number(p.cost).toFixed(2) : '—'}</td><td>{p.qty}</td>
              <td><span className={'tg ' + s[1]}>{s[0]}</span>{p.price_problem && <><br /><small>Price problem</small></>}</td>
              <td><button className="btn" onClick={() => { setF({ ...p, cost: p.cost ?? '' }); setMsg('') }}>Edit</button></td>
            </tr>
          )
        })}</tbody>
      </table></div>
      <div className="row c"><button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / PS))}</span><button className="btn" disabled={(page + 1) * PS >= total} onClick={() => setPage(page + 1)}>Next</button></div>

      {f && (
        <div className="ov c" onClick={(e) => { if (e.target === e.currentTarget) setF(null) }}>
          <div className="md" role="dialog" aria-modal="true" aria-label="Edit product">
            <h2>{f.id ? 'Edit product #' + f.item_number : 'Add product'}</h2>
            <label htmlFor="pn">Product name</label><input id="pn" value={f.name} onChange={set('name')} />
            <label htmlFor="pd">Description</label><textarea id="pd" rows="2" value={f.description || ''} onChange={set('description')} />
            <label>Photo</label>
            <div className={'dz' + (drag ? ' on' : '')} tabIndex={0} role="button" aria-label="Add photo: drag and drop or click"
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current.click()} onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current.click() }}>
              {f.image_url ? <img src={f.image_url} alt="Product preview" /> : <span>Drag and drop a photo here, or click to choose one<br /><small>Max 5 MB</small></span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
            <div className="row"><input style={{ flex: 1 }} placeholder="Or paste an image link (https://...)" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Image link" /><button className="btn" onClick={useLink}>Use link</button><button className="btn d" onClick={() => setF({ ...f, image_url: '' })}>Remove</button></div>
            <div className="fm"><div><label htmlFor="pr">Retail price</label><input id="pr" type="number" step="0.01" value={f.retail_price} onChange={set('retail_price')} /></div><div><label htmlFor="pw">Wholesale price</label><input id="pw" type="number" step="0.01" value={f.wholesale_price} onChange={set('wholesale_price')} /></div><div><label htmlFor="pc">Cost (admin only)</label><input id="pc" type="number" step="0.01" value={f.cost} onChange={set('cost')} /></div></div>
            <div className="fm"><div><label htmlFor="pq">Quantity</label><input id="pq" type="number" value={f.qty} onChange={set('qty')} /></div><div><label htmlFor="pu">UPC barcode</label><input id="pu" value={f.upc || ''} onChange={set('upc')} /></div></div>
            <div className="fm"><div><label htmlFor="pk">Category</label><select id="pk" value={f.category_id || ''} onChange={set('category_id')}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label htmlFor="pb">Brand</label><input id="pb" value={f.brand || ''} onChange={set('brand')} /></div></div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.hidden} onChange={set('hidden')} /> Hide from website</label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.mark_sold} onChange={set('mark_sold')} /> Mark as sold (no price shown)</label>
            <p className="mute"><small>Items with a price problem (missing price, or wholesale not lower than retail) always show as Sold. Changing the wholesale price resets customers' saved prices for this item.</small></p>
            {msg && <p className="err">{msg}</p>}
            <div className="row"><button className="btn f" onClick={save}>Save</button><button className="btn" onClick={() => setF(null)}>Cancel</button>{f.id && <button className="btn d" style={{ marginLeft: 'auto' }} onClick={remove}>Delete</button>}</div>
          </div>
        </div>
      )}
    </>
  )
}
