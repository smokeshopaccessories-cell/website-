// Reads inventory files (POS export .xlsx or .csv) and maps them to product rows.

export function parseCSV(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

export async function readFileRows(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCSV((await file.text()).replace(/^\uFEFF/, ''))
  if (name.endsWith('.xlsx')) {
    const mod = await import('read-excel-file')
    return await mod.default(file)
  }
  throw new Error('Please choose an .xlsx or .csv file.')
}

const ALIASES = {
  item_number: ['itemnumber', 'itemno', 'itemnum', 'productnumber', 'sku', 'item'],
  name: ['itemname', 'name', 'productname', 'title'],
  description: ['itemdescription', 'description', 'productdescription', 'desc'],
  category: ['departmentname', 'department', 'category', 'categoryname', 'categoryid'],
  brand: ['brand'],
  retail: ['regularprice', 'retailprice', 'retail', 'price'],
  wholesale: ['customprice3', 'wholesaleprice', 'wholesale'],
  cost: ['averageunitcost', 'cost', 'costofproduct', 'unitcost'],
  upc: ['upc', 'barcode', 'barcodetoscan'],
  qty: ['qty1', 'qty', 'quantity', 'inventory', 'onhand'],
}
const norm = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const DEPT = {
  'rolling papers': 'Rolling papers and wraps', 'rolling papers/wraps': 'Rolling papers and wraps', 'wraps': 'Rolling papers and wraps',
  'tobacco': 'Tobacco and cigars', 'cigars': 'Tobacco and cigars',
  'e-cig/vape': 'Vapes and disposables', 'disposables': 'Vapes and disposables', 'vape': 'Vapes and disposables',
  'pre roll': 'Hemp and THC-A', 'flower': 'Hemp and THC-A', 'gummies': 'Hemp and THC-A', 'cbd/delta8': 'Hemp and THC-A', 'thc-a vapes': 'Hemp and THC-A', 'thc drink': 'Hemp and THC-A',
  'kratom': 'Kratom',
  'glass pipes': 'Glass, pipes and grinders', 'pipes': 'Glass, pipes and grinders', 'grinders': 'Glass, pipes and grinders', 'puffco': 'Glass, pipes and grinders',
  'hookah': 'Hookah', 'lighters': 'Lighters and butane', 'butane': 'Lighters and butane', 'scales': 'Scales', 'detox': 'Detox',
  'safes': 'Safes and stash cans', 'stash cans': 'Safes and stash cans', 'tray': 'Trays and ash trays', 'ash tray': 'Trays and ash trays',
  'male inhancement': 'Wellness and enhancement', 'femailinhancement': 'Wellness and enhancement', 'pills': 'Wellness and enhancement', 'honey': 'Wellness and enhancement',
  'exotic snacks': 'Snacks and drinks', 'syrup': 'Snacks and drinks',
  'perfume': 'Lifestyle and novelty', 'incense/spray': 'Lifestyle and novelty', 'incense': 'Lifestyle and novelty', 'pokemon cards': 'Lifestyle and novelty', 'dog treats': 'Lifestyle and novelty', 'pouches': 'Lifestyle and novelty',
}
const KEYWORDS = [
  [/kratom/, 'Kratom'], [/whip|nitro|nos tank|n2o/, 'Whip-It and nitrous'], [/hookah|charcoal|shisha|foil/, 'Hookah'],
  [/cone|wrap|paper|tips/, 'Rolling papers and wraps'], [/vaporizer|vape|cart/, 'Vapes and disposables'], [/delta|thc|hemp|cbd/, 'Hemp and THC-A'],
  [/incense|perfume|spray/, 'Lifestyle and novelty'], [/detox/, 'Detox'], [/stash|safe/, 'Safes and stash cans'], [/lighter|torch|zippo|butane/, 'Lighters and butane'],
  [/scale/, 'Scales'], [/grinder|pipe|bong|glass/, 'Glass, pipes and grinders'], [/tray/, 'Trays and ash trays'], [/pills|honey/, 'Wellness and enhancement'],
]

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
const clean = (s) => { s = String(s ?? '').trim(); return s && s === s.toUpperCase() && /[A-Z]/.test(s) ? titleCase(s) : s }
const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return isFinite(v) ? v : null
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''))
  return isNaN(n) ? null : n
}
export function brandOf(name) {
  const w = String(name).replace(/[^A-Za-z0-9&' -]/g, '').split(/\s+/).filter(Boolean)
  if (!w.length) return null
  if (w[0].toLowerCase() === 'al' && w[1] && w[1].toLowerCase() === 'fakher') return 'Al Fakher'
  return w[0] === w[0].toUpperCase() ? titleCase(w[0]) : w[0]
}

// cats: [{id, name, visible}]
export function mapRows(rows, cats) {
  if (!rows || rows.length < 2) return { error: 'The file has no data rows.' }
  const head = rows[0].map(norm)
  const idx = {}
  for (const [k, list] of Object.entries(ALIASES)) {
    const i = head.findIndex((h) => list.includes(h))
    if (i >= 0) idx[k] = i
  }
  if (idx.item_number === undefined || idx.name === undefined) return { error: 'Could not find the "Item Number" and "Item Name" columns. Download the template to see the expected columns.' }
  const byName = Object.fromEntries(cats.map((c) => [c.name.toLowerCase(), c]))
  const byId = Object.fromEntries(cats.map((c) => [String(c.id), c]))
  const fallback = byName['accessories'] || cats[0]
  const get = (r, k) => (idx[k] === undefined ? undefined : r[idx[k]])

  const out = [], warnings = []
  let skipped = 0
  const seen = new Map()
  rows.slice(1).forEach((r, n) => {
    const line = n + 2
    const itemNum = num(get(r, 'item_number'))
    const rawName = String(get(r, 'name') ?? '').trim()
    if (itemNum === null && !rawName) return
    if (itemNum === null || !Number.isInteger(itemNum) || itemNum <= 0) { skipped++; warnings.push('Row ' + line + ': missing or invalid item number, skipped'); return }
    if (!rawName) { skipped++; warnings.push('Row ' + line + ': item ' + itemNum + ' has no name, skipped'); return }
    const name = clean(rawName)
    const desc = clean(get(r, 'description'))
    let retail = num(get(r, 'retail')), wholesale = num(get(r, 'wholesale')), cost = num(get(r, 'cost'))
    let qty = num(get(r, 'qty')), upcRaw = get(r, 'upc')
    let upc = upcRaw === null || upcRaw === undefined ? '' : String(upcRaw).trim()
    if (qty !== null && Math.abs(qty) > 1000000) {
      if (!upc && qty >= 1e9) { upc = String(Math.round(qty)); warnings.push('Item ' + itemNum + ' (' + name + '): a barcode was typed into Quantity, so it was moved to UPC and quantity set to 0') }
      else warnings.push('Item ' + itemNum + ' (' + name + '): quantity looked wrong, set to 0')
      qty = 0
    }
    if (qty !== null) qty = Math.round(qty)
    // category
    const rawCat = String(get(r, 'category') ?? '').trim()
    let cat = byName[rawCat.toLowerCase()] || byId[rawCat]
    if (!cat && rawCat) { const nm = DEPT[rawCat.toLowerCase()]; if (nm) cat = byName[nm.toLowerCase()] }
    if (!cat || rawCat.toLowerCase() === 'general item' || rawCat.toLowerCase() === 'accessories' || rawCat.toLowerCase() === 'system') {
      const lc = name.toLowerCase()
      const kw = KEYWORDS.find(([re]) => re.test(lc))
      const kc = kw && byName[kw[1].toLowerCase()]
      cat = kc || cat || fallback
    }
    const row = {
      item_number: itemNum, name, description: desc || null, category_id: cat ? cat.id : null,
      brand: (get(r, 'brand') ? String(get(r, 'brand')).trim() : brandOf(name)),
      retail_price: retail ?? 0, wholesale_price: wholesale ?? 0, cost: cost, upc: upc || null, qty: qty ?? 0,
      hidden: cat ? !cat.visible : false,
      _has: { retail: retail !== null, wholesale: wholesale !== null, cost: cost !== null, qty: qty !== null, upc: !!upc },
    }
    if (seen.has(itemNum)) { warnings.push('Item ' + itemNum + ' appears more than once; the last row was used'); out[seen.get(itemNum)] = row }
    else { seen.set(itemNum, out.length); out.push(row) }
  })
  return { rows: out, warnings, skipped, columns: Object.keys(idx) }
}

export const TEMPLATE = 'Item Number,Item Name,Item Description,Department Name,Regular Price,Custom Price 3,Average Unit Cost,UPC,Qty 1\n9001,Sample Product,Sample description,Accessories,10.00,7.50,5.00,012345678905,12\n'
