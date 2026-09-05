import { expect, it } from 'vitest'

import { monthlyConsumption, monthDifference } from './monthly'

it('counts bought items only from finalized lists in selected month', () => {
  const result = monthlyConsumption([
    {
      id: 'september', user_id: 'user-1', name: 'Market', is_archived: true, created_at: '2026-09-01T12:00:00.000Z', archived_at: '2026-09-02T12:00:00.000Z',
      items: [
        { id: 'rice', list_id: 'september', name: 'Rice', quantity: 2, price: 10, is_purchased: true },
        { id: 'coffee', list_id: 'september', name: 'Coffee', quantity: 1, price: 9, is_purchased: false },
      ],
    },
    {
      id: 'august', user_id: 'user-1', name: 'Market', is_archived: true, created_at: '2026-08-29T12:00:00.000Z', archived_at: '2026-08-30T12:00:00.000Z',
      items: [{ id: 'beans', list_id: 'august', name: 'Beans', quantity: 1, price: 7, is_purchased: true }],
    },
  ], new Date('2026-09-15T12:00:00.000Z'))

  expect(result).toEqual({ total: 20, purchases: 1 })
  expect(monthDifference(20, 7)).toBe(13)
})
