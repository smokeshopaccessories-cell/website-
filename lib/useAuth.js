'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [s, setS] = useState({ loading: true, user: null, profile: null })
  useEffect(() => {
    let on = true
    async function load(session) {
      const user = session?.user || null
      let profile = null
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        profile = data
      }
      if (on) setS({ loading: false, user, profile })
    }
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session), 0)
    })
    return () => { on = false; sub.subscription.unsubscribe() }
  }, [])
  return s
}
