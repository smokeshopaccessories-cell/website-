'use client'
import { useEffect, useState } from 'react'

export default function AgeGate() {
  const [show, setShow] = useState(false)
  useEffect(() => { if (!sessionStorage.getItem('age21')) setShow(true) }, [])
  if (!show) return null
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="agt">
      <div className="bx">
        <h2 id="agt">Are you 21 or older?</h2>
        <p className="mute">You must be 21+ to view this site.</p>
        <div className="row c">
          <button className="btn f" onClick={() => { sessionStorage.setItem('age21', '1'); setShow(false) }}>Yes, I'm 21+</button>
          <button className="btn" onClick={() => { window.location.href = 'https://www.google.com' }}>No, leave</button>
        </div>
      </div>
    </div>
  )
}
