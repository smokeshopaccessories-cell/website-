import { createClient } from '@supabase/supabase-js'

// Public connection details for the smoke-shop-portal database (safe in the browser).
// Hard-coded on purpose so a stray Vercel environment variable cannot point the site at another project.
export const supabase = createClient(
  'https://ftjfmtqignaxgsvubzue.supabase.co',
  'sb_publishable_L78yF5XYA0MHbcpQQwkTUQ_3Eao32mV'
)
