'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { TOPICS } from '../../lib/notices'

export default function Support() {
  const [threads, setThreads] = useState([])
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('open')
  const [sel, setSel] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const end = useRef(null)

  const loadThreads = async () => {
    let q = supabase.from('support_threads').select('*, profiles(full_name,business_name,email,phone)').order('admin_unread', { ascending: false }).order('last_message_at', { ascending: false }).limit(100)
    if (topic) q = q.eq('topic', topic)
    if (status) q = q.eq('status', status)
    const { data } = await q
    setThreads(data || [])
  }
  const loadMsgs = async (id) => {
    const { data } = await supabase.from('support_messages').select('*').eq('thread_id', id).order('created_at')
    setMsgs(data || [])
  }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 20000); return () => clearInterval(t) }, [topic, status])
  useEffect(() => {
    if (!sel) return
    loadMsgs(sel.id); supabase.rpc('mark_thread_read', { p_thread: sel.id }).then(loadThreads)
    const t = setInterval(() => loadMsgs(sel.id), 8000)
    return () => clearInterval(t)
  }, [sel?.id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length])

  async function send() {
    if (!text.trim()) return
    const { error } = await supabase.from('support_messages').insert({ thread_id: sel.id, sender: 'admin', body: text.trim() })
    if (error) { setErr(error.message); return }
    setText(''); setErr(''); loadMsgs(sel.id); loadThreads()
  }
  async function setThreadStatus(s) {
    await supabase.from('support_threads').update({ status: s }).eq('id', sel.id)
    setSel({ ...sel, status: s }); loadThreads()
  }

  if (sel) {
    const c = sel.profiles || {}
    return (
      <div className="cd">
        <div className="ln"><b>{sel.subject}</b><span className="tg">{TOPICS[sel.topic]}</span></div>
        <p className="mute">{c.business_name || c.full_name} · {c.email} · {c.phone || ''}{sel.order_id ? ' · Order #' + sel.order_id : ''}</p>
        <div className="chat">
          {msgs.map((m) => <div key={m.id} className={'bub ' + m.sender}><small>{m.sender === 'admin' ? 'You' : (c.business_name || c.full_name)} · {new Date(m.created_at).toLocaleString()}</small><p>{m.body}</p></div>)}
          <div ref={end} />
        </div>
        {err && <p className="err">{err}</p>}
        <div className="fm"><div style={{ flex: 3 }}><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Write a reply" aria-label="Reply" maxLength={4000} /></div><button className="btn f" onClick={send}>Send</button>
          {sel.status === 'open' ? <button className="btn" onClick={() => setThreadStatus('closed')}>Close chat</button> : <button className="btn" onClick={() => setThreadStatus('open')}>Reopen</button>}
          <button className="btn" onClick={() => { setSel(null); loadThreads() }}>Back to inbox</button></div>
      </div>
    )
  }

  return (
    <>
      <div className="fm">
        <div><select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic"><option value="">All topics</option>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="open">Open chats</option><option value="closed">Closed chats</option><option value="">All</option></select></div>
      </div>
      {threads.length === 0 && <p className="mute" style={{ marginTop: 14 }}>No chats here.</p>}
      {threads.map((t) => {
        const c = t.profiles || {}
        return (
          <button key={t.id} className={'thr' + (t.admin_unread ? ' unread' : '')} onClick={() => setSel(t)}>
            <span><b>{t.subject}</b><br /><small>{c.business_name || c.full_name} · {TOPICS[t.topic]} · {new Date(t.last_message_at).toLocaleString()}</small></span>
            <span>{t.admin_unread && <span className="tg w">New</span>} <span className={'tg ' + (t.status === 'open' ? '' : 'b')}>{t.status}</span></span>
          </button>
        )
      })}
    </>
  )
}
