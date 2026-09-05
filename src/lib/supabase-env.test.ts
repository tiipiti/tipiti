import { describe, expect, it } from 'vitest'

import { requireSupabaseEnv } from './supabase-env'

describe('requireSupabaseEnv', () => {
  it('rejects incomplete public Supabase configuration', () => {
    expect(() => requireSupabaseEnv('', 'key')).toThrow('VITE_SUPABASE_URL')
  })
})
