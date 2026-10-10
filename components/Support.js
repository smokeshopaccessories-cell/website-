'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TOPICS } from '../lib/notices'

// Customer chat: one separate conversation per topic.
export default function Support({ user }) {
  const [threads, setThreads] = useState([])
  const [sel, setSel] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [form, setForm] = useState(null)
  const [err, setErr] = useState('')
  const end = useRef(null)

  const loadThreads = async () => {
    const { data } = await supabase.from('support_threads').select('*').eq('customer_id', user.id).order('last_message_at', { ascending: false })
    setThreads(data || [])
  }
  const loadMsgs = async (id) => {
    const { data } = await supabase.from('support_messages').select('*').eq('thread_id', id).order('created_at')
    setMsgs(data || [])
  }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 20000); return () => clearInterval(t) }, [user.id])
  useEffect(() => {
    if (!sel) return
    loadMsgs(sel.id); supabase.rpc('mark_thread_read', { p_thread: sel.id }).then(loadThreads)
    const t = setInterval(() => loadMsgs(sel.id), 10000)
    return () => clearInterval(t)
  }, [sel?.id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length])

  async function start() {
    setErr('')
    if (!form.subject.trim() || !form.body.trim()) { setErr('Please add a subject and a message.'); return }
    const t = await supabase.from('support_threads').insert({ customer_id: user.id, topic: form.topic, subject: form.subject.trim() }).select('*').single()
    if (t.error) { setErr(t.error.message); return }
    const m = await supabase.from('support_messages').insert({ thread_id: t.data.id, sender: 'customer', body: form.body.trim() })
    if (m.error) { setErr(m.error.message); return }
    setForm(null); await loadThreads(); setSel(t.data)
  }
  async function send() {
    if (!text.trim()) return
    const { error } = await supabase.from('support_messages').insert({ thread_id: sel.id, sender: 'customer', body: text.trim() })
    if (error) { setErr(error.message); return }
    setText(''); loadMsgs(sel.id); loadThreads()
  }

  if (sel) return (
    <div className="cd">
      <div className="ln"><b>{sel.subject}</b><span className="tg">{TOPICS[sel.topic]}</span></div>
      <div className="chat">
        {msgs.map((m) => <div key={m.id} className={'bub ' + m.sender}><small>{m.sender === 'admin' ? 'Store' : 'You'} · {new Date(m.created_at).toLocaleString()}</small><p>{m.body}</p></div>)}
        <div ref={end} />
      </div>
      {sel.status === 'closed' && <p className="mute">This chat was closed. Sending a message reopens it.</p>}
      {err && <p className="err">{err}</p>}
      <div className="fm"><div style={{ flex: 3 }}><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Write a message" aria-label="Message" maxLength={4000} /></div><button className="btn f" onClick={send}>Send</button><button className="btn" onClick={() => { setSel(null); setErr('') }}>Back to chats</button></div>
    </div>
  )

  return (
    <div className="cd">
      {!form && <div className="row" style={{ marginTop: 0 }}><button className="btn f" onClick={() => setForm({ topic: 'orders', subject: '', body: '' })}>Start a new chat</button></div>}
      {form && (
        <div>
          <p className="mute"><small>To ask for a lower price on an item, use the price box next to that item in your order request.</small></p>
          <label htmlFor="ct">What do you need help with?</label>
          <select id="ct" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>{Object.entries(TOPICS).filter(([k]) => k !== 'price').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <label htmlFor="cs">Subject</label><input id="cs" value={form.subject} maxLength={120} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <label htmlFor="cb">Message</label><textarea id="cb" rows="3" value={form.body} maxLength={4000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {err && <p className="err">{err}</p>}
          <div className="row"><button className="btn f" onClick={start}>Send</button><button className="btn" onClick={() => { setForm(null); setErr('') }}>Cancel</button></div>
        </div>
      )}
      {threads.length === 0 && !form && <p className="mute">No chats yet.</p>}
      {threads.map((t) => (
        <button key={t.id} className="thr" onClick={() => setSel(t)}>
          <span><b>{t.subject}</b><br /><small>{TOPICS[t.topic]} · {new Date(t.last_message_at).toLocaleDateString()}</small></span>
          <span>{t.customer_unread && <span className="tg w">New reply</span>} <span className={'tg ' + (t.status === 'open' ? '' : 'b')}>{t.status}</span></span>
        </button>
      ))}
    </div>
  )
}
