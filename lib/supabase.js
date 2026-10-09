import { createClient } from '@supabase/supabase-js'

// These two values are public by design (safe in the browser). Your data is protected by database rules.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ftjfmtqignaxgsvubzue.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_L78yF5XYA0MHbcpQQwkTUQ_3Eao32mV'

export const supabase = createClient(url, key)
