import { purchasedTotal } from './total'
import type { ArchivedListWithItems } from './types'

export const monthlyConsumption = (lists: ArchivedListWithItems[], month: Date) => {
  const year = month.getFullYear()
  const index = month.getMonth()
  const included = lists.filter(({ archived_at }) => {
    if (!archived_at) return false
    const date = new Date(archived_at)
    return date.getFullYear() === year && date.getMonth() === index
  })
  return { total: included.reduce((sum, list) => sum + purchasedTotal(list.items), 0), purchases: included.length }
}

export const monthDifference = (current: number, previous: number) => current - previous
