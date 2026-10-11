'use client'
import { DOC_TYPES } from '../lib/docs'

// One section where a wholesale customer can add many license / permit pictures. Optional.
export default function DocPicker({ items, onChange }) {
  const add = (fileList) => {
    const more = Array.from(fileList || []).map((file) => ({ file, type: 'tobacco_license' }))
    onChange([...items, ...more])
  }
  return (
    <div className="ask" style={{ marginTop: 8 }}>
      <label htmlFor="docs"><b>License & permit pictures (optional)</b></label>
      <p className="mute" style={{ margin: '2px 0 6px' }}><small>Add as many pictures as you have: tobacco license, tax permit, e-cig permit, or any other. Choose what each one is.</small></p>
      <input id="docs" type="file" accept="image/*" multiple onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      {items.map((it, k) => (
        <div className="ln" key={k} style={{ alignItems: 'center' }}>
          <span style={{ wordBreak: 'break-all' }}>{it.file.name}</span>
          <span className="row" style={{ margin: 0 }}>
            <select aria-label={'Type for ' + it.file.name} value={it.type} onChange={(e) => onChange(items.map((x, j) => (j === k ? { ...x, type: e.target.value } : x)))}>
              {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button type="button" className="btn d" onClick={() => onChange(items.filter((_, j) => j !== k))}>Remove</button>
          </span>
        </div>
      ))}
    </div>
  )
}
