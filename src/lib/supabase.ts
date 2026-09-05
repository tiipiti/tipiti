import { createClient } from '@supabase/supabase-js'

import { requireSupabaseEnv } from './supabase-env'

const { url, publishableKey } = requireSupabaseEnv(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

export const supabase = createClient(url, publishableKey)
