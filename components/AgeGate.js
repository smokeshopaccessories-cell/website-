'use client'
import { useEffect, useState } from 'react'

function ageOf(dob) {
  const d = new Date(dob + 'T00:00:00'), n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--
  return a
}

export default function AgeGate() {
  const [show, setShow] = useState(false)
  const [dob, setDob] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { if (!sessionStorage.getItem('age21')) setShow(true) }, [])
  if (!show) return null

  function check(e) {
    e.preventDefault()
    if (!dob || isNaN(new Date(dob).getTime())) { setErr('Please enter your date of birth.'); return }
    const a = ageOf(dob)
    if (a < 0 || a > 120) { setErr('Please enter a valid date of birth.'); return }
    if (a < 21) { setErr('Sorry, you must be 21 or older to enter this site.'); return }
    sessionStorage.setItem('age21', '1')
    setShow(false)
  }

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="agt">
      <form className="bx" onSubmit={check}>
        <h2 id="agt">Age check</h2>
        <p>You must be 21 or older to enter. Please enter your date of birth.</p>
        <label htmlFor="dobg" style={{ textAlign: 'left' }}>Date of birth</label>
        <input id="dobg" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDob(e.target.value); setErr('') }} />
        {err && <p className="err">{err}</p>}
        <div className="row c">
          <button className="btn f">Enter site</button>
          <button type="button" className="btn" onClick={() => { window.location.href = 'https://www.google.com' }}>Leave</button>
        </div>
        <p className="mute"><small>We do not save your date of birth from this check.</small></p>
      </form>
    </div>
  )
}
