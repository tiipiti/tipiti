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

export interface MonthSpending {
  monthKey: string
  label: string
  shortLabel: string
  fullLabel: string
  year: number
  monthIndex: number
  total: number
  purchases: number
  itemsCount: number
}

export const getMonthlyHistory = (
  lists: ArchivedListWithItems[],
  monthsCount = 6,
  referenceDate = new Date(),
): MonthSpending[] => {
  const result: MonthSpending[] = []
  const refYear = referenceDate.getFullYear()
  const refMonth = referenceDate.getMonth()

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - i, 1)
    const year = d.getFullYear()
    const monthIndex = d.getMonth()
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

    const included = lists.filter(({ archived_at }) => {
      if (!archived_at) return false
      const listDate = new Date(archived_at)
      return listDate.getFullYear() === year && listDate.getMonth() === monthIndex
    })

    const total = included.reduce((sum, list) => sum + purchasedTotal(list.items), 0)
    const purchases = included.length
    const itemsCount = included.reduce(
      (sum, list) => sum + (list.items?.filter((item) => item.is_purchased)?.length ?? 0),
      0,
    )

    const rawMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')
    const shortLabel = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)
    const yearShort = String(year).slice(-2)
    const label = `${shortLabel}/${yearShort}`

    const rawFullMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d)
    const fullMonth = rawFullMonth.charAt(0).toUpperCase() + rawFullMonth.slice(1)
    const fullLabel = `${fullMonth} de ${year}`

    result.push({
      monthKey,
      label,
      shortLabel,
      fullLabel,
      year,
      monthIndex,
      total,
      purchases,
      itemsCount,
    })
  }

  return result
}

export const getHistoryStats = (history: MonthSpending[]) => {
  const totalSpent = history.reduce((sum, m) => sum + m.total, 0)
  const totalPurchases = history.reduce((sum, m) => sum + m.purchases, 0)
  const totalItems = history.reduce((sum, m) => sum + m.itemsCount, 0)
  const averagePerMonth = history.length > 0 ? totalSpent / history.length : 0

  let maxMonth: MonthSpending | null = null
  for (const m of history) {
    if (!maxMonth || m.total > maxMonth.total) {
      maxMonth = m
    }
  }

  return {
    totalSpent,
    totalPurchases,
    totalItems,
    averagePerMonth,
    maxMonth,
  }
}
