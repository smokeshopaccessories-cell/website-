'use client'
import { useRef } from 'react'

export default function Scroller({ children }) {
  const r = useRef(null)
  const go = (d) => r.current && r.current.scrollBy({ left: d * r.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="sc">
      <button className="sa l" onClick={() => go(-1)} aria-label="Previous">‹</button>
      <div className="st" ref={r}>{children}</div>
      <button className="sa r" onClick={() => go(1)} aria-label="Next">›</button>
    </div>
  )
}
