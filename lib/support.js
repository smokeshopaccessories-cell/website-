import { supabase } from './supabase'

// Admin: send a message into the customer's open chat for this topic (or start a new chat).
export async function adminMessage(customerId, topic, subject, body, orderId = null) {
  let q = supabase.from('support_threads').select('id').eq('customer_id', customerId).eq('topic', topic).eq('status', 'open')
  q = orderId ? q.eq('order_id', orderId) : q.is('order_id', null)
  const { data } = await q.order('id', { ascending: false }).limit(1)
  let id = data?.[0]?.id
  if (!id) {
    const r = await supabase.from('support_threads').insert({ customer_id: customerId, topic, subject, order_id: orderId, admin_unread: false }).select('id').single()
    if (r.error) return { error: r.error }
    id = r.data.id
  }
  return await supabase.from('support_messages').insert({ thread_id: id, sender: 'admin', body })
}
