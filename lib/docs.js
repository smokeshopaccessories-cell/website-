import { supabase } from './supabase'

export const DOC_TYPES = {
  tobacco_license: 'Tobacco license',
  tax_permit: 'Tax permit',
  ecig_permit: 'E-cig permit',
  other: 'Other',
}
export const MAX_DOCS = 10
export const MAX_BYTES = 5 * 1024 * 1024

export function checkFiles(items) {
  if (items.length > MAX_DOCS) return 'You can add up to ' + MAX_DOCS + ' pictures at a time.'
  const bad = items.find((x) => !x.file.type.startsWith('image/') || x.file.size > MAX_BYTES)
  return bad ? '"' + bad.file.name + '" must be a picture under 5 MB.' : ''
}

// Uploads every picture and records it. Returns { done, failed }.
export async function uploadDocs(userId, items) {
  let done = 0, failed = 0
  const paths = {}
  for (const it of items) {
    const path = userId + '/' + it.type + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '-' + it.file.name.replace(/[^a-z0-9.]/gi, '_')
    const up = await supabase.storage.from('wholesale-documents').upload(path, it.file)
    if (up.error) { failed++; continue }
    const ins = await supabase.from('wholesale_documents').insert({ customer_id: userId, doc_type: it.type, path, file_name: it.file.name })
    if (ins.error) { failed++; continue }
    done++
    if (!paths[it.type]) paths[it.type] = path
  }
  // Keep the older single-license fields filled in too, so nothing that already reads them breaks.
  const lic = paths.tobacco_license || paths.ecig_permit || paths.other || null
  const res = paths.tax_permit || null
  if (lic || res) await supabase.rpc('set_my_documents', { p_license: lic, p_resale: res })
  return { done, failed }
}
