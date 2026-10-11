'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Pop-up that renders on top of the whole page (outside any card), so hover effects can't make it flicker.
export default function Modal({ onClose, label, wide, children }) {
  const [mounted, setMounted] = useState(false)
  const close = useRef(onClose)
  close.current = onClose
  const box = useRef(null)

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e) => { if (e.key === 'Escape') close.current() }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', key) }
  }, [])
  useEffect(() => { if (mounted && box.current) box.current.focus() }, [mounted])

  if (!mounted) return null
  return createPortal(
    <div className="ov c fade" onMouseDown={(e) => { if (e.target === e.currentTarget) close.current() }}>
      <div className={'md pop' + (wide ? ' big' : '')} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={box}>
        {children}
      </div>
    </div>,
    document.body
  )
}
