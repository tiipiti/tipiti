import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import { cloneItemPayloads } from './api'

describe('cloneItemPayloads', () => {
  it('copies item details and resets purchase state', () => {
    expect(
      cloneItemPayloads('new-list', [
        { name: 'Arroz', quantity: 2, price: 8, is_purchased: true },
      ]),
    ).toEqual([
      {
        list_id: 'new-list',
        name: 'Arroz',
        quantity: 2,
        price: 8,
        is_purchased: false,
      },
    ])
  })
})
