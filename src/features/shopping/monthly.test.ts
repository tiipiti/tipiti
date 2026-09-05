import { expect, it } from 'vitest'

import { getHistoryStats, getMonthlyHistory, monthDifference, monthlyConsumption } from './monthly'

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

it('generates monthly history and calculates statistics', () => {
  const lists = [
    {
      id: 'l1', user_id: 'u1', name: 'Setembro', is_archived: true, created_at: '2026-09-01T12:00:00Z', archived_at: '2026-09-02T12:00:00Z',
      items: [{ id: 'i1', list_id: 'l1', name: 'Arroz', quantity: 2, price: 25, is_purchased: true }],
    },
    {
      id: 'l2', user_id: 'u1', name: 'Agosto', is_archived: true, created_at: '2026-08-10T12:00:00Z', archived_at: '2026-08-15T12:00:00Z',
      items: [{ id: 'i2', list_id: 'l2', name: 'Feijao', quantity: 1, price: 30, is_purchased: true }],
    },
  ]

  const history = getMonthlyHistory(lists, 3, new Date('2026-09-10T12:00:00Z'))
  expect(history).toHaveLength(3)

  // July (Jul), August (Ago), September (Set)
  expect(history[0].total).toBe(0)
  expect(history[0].purchases).toBe(0)

  expect(history[1].total).toBe(30)
  expect(history[1].purchases).toBe(1)
  expect(history[1].itemsCount).toBe(1)

  expect(history[2].total).toBe(50)
  expect(history[2].purchases).toBe(1)
  expect(history[2].itemsCount).toBe(1)

  const stats = getHistoryStats(history)
  expect(stats.totalSpent).toBe(80)
  expect(stats.totalPurchases).toBe(2)
  expect(stats.averagePerMonth).toBeCloseTo(26.666, 1)
  expect(stats.maxMonth?.total).toBe(50)
})
