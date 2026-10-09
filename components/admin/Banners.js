'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

async function upload(file, folder) {
  if (!file || !file.type.startsWith('image/')) return { error: 'Please choose an image file.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Image is over 5 MB.' }
  const path = folder + '/' + Date.now() + '-' + file.name.replace(/[^a-z0-9.]/gi, '_')
  const { error } = await supabase.storage.from('product-images').upload(path, file)
  if (error) return { error: error.message }
  return { url: supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl }
}

export default function Banners() {
  const [banners, setBanners] = useState([])
  const [logos, setLogos] = useState([])
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [msg, setMsg] = useState('')
  const bref = useRef(null)
  const lref = useRef(null)

  const load = async () => {
    const b = await supabase.from('banners').select('*').order('sort').order('id')
    setBanners(b.data || [])
    const l = await supabase.from('brand_logos').select('*').order('brand')
    setLogos(l.data || [])
  }
  useEffect(() => { load() }, [])

  async function addBanner(file) {
    const r = await upload(file, 'banners')
    if (r.error) { setMsg(r.error); return }
    const { error } = await supabase.from('banners').insert({ image_url: r.url, link: link || null, title: title || null, sort: banners.length })
    setMsg(error ? error.message : 'Banner added.'); if (!error) { setLink(''); setTitle(''); load() }
  }
  async function addLogo(file) {
    if (!brand.trim()) { setMsg('Type the brand name first (exactly as it appears in your products, for example Raw).'); return }
    const r = await upload(file, 'brands')
    if (r.error) { setMsg(r.error); return }
    const { error } = await supabase.from('brand_logos').upsert({ brand: brand.trim(), logo_url: r.url })
    setMsg(error ? error.message : 'Logo saved.'); if (!error) { setBrand(''); load() }
  }
  const upd = async (id, patch) => { await supabase.from('banners').update(patch).eq('id', id); load() }

  return (
    <>
      {msg && <p className="note">{msg}</p>}
      <div className="cd">
        <h3>Home page banners</h3>
        <p className="mute">Wide images (about 1600 × 600). They slide automatically on the home page. If you add none, a default banner is shown.</p>
        <div className="fm">
          <div><label htmlFor="bt">Title (for accessibility)</label><input id="bt" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label htmlFor="bl">Link when clicked (optional, for example /category/1)</label><input id="bl" value={link} onChange={(e) => setLink(e.target.value)} /></div>
          <button className="btn f" onClick={() => bref.current.click()}>Choose banner image</button>
          <input ref={bref} type="file" accept="image/*" hidden onChange={(e) => { addBanner(e.target.files[0]); e.target.value = '' }} />
        </div>
      </div>
      {banners.map((b) => (
        <div className="cd" key={b.id}>
          <div className="fm">
            <img src={b.image_url} alt="" style={{ width: 200, borderRadius: 8 }} />
            <div style={{ flex: 2 }}><b>{b.title || 'Untitled'}</b><br /><small>{b.link || 'No link'}</small></div>
            <div style={{ maxWidth: 90 }}><label>Order</label><input type="number" defaultValue={b.sort} onBlur={(e) => upd(b.id, { sort: Number(e.target.value) || 0 })} /></div>
            <button className="btn" onClick={() => upd(b.id, { active: !b.active })}>{b.active ? 'Hide' : 'Show'}</button>
            <button className="btn d" onClick={async () => { if (confirm('Delete this banner?')) { await supabase.from('banners').delete().eq('id', b.id); load() } }}>Delete</button>
            <span className={'tg ' + (b.active ? '' : 'b')}>{b.active ? 'Showing' : 'Hidden'}</span>
          </div>
        </div>
      ))}
      <div className="cd">
        <h3>Brand logos</h3>
        <p className="mute">Brand logos show in the strip under the banner. Brands without a logo show their name in text.</p>
        <div className="fm">
          <div><label htmlFor="bn">Brand name</label><input id="bn" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <button className="btn f" onClick={() => lref.current.click()}>Choose logo image</button>
          <input ref={lref} type="file" accept="image/*" hidden onChange={(e) => { addLogo(e.target.files[0]); e.target.value = '' }} />
        </div>
        <div className="fm" style={{ marginTop: 14 }}>
          {logos.map((l) => (
            <div key={l.brand} style={{ textAlign: 'center', flex: '0 0 120px' }}>
              <img src={l.logo_url} alt={l.brand} style={{ maxHeight: 50, maxWidth: 110, objectFit: 'contain' }} /><br /><small>{l.brand}</small><br />
              <button className="btn d" onClick={async () => { await supabase.from('brand_logos').delete().eq('brand', l.brand); load() }}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
