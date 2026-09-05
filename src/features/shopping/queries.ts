import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from './api'
import { getHistoryStats, getMonthlyHistory, monthlyConsumption } from './monthly'

export const shoppingKeys = {
  lists: ['lists'] as const,
  archivedWithItems: ['lists', 'archived-with-items'] as const,
  list: (id: string) => ['list', id] as const,
  items: (id: string) => ['items', id] as const,
}

export const useActiveLists = () => useQuery({ queryKey: shoppingKeys.lists, queryFn: api.getActiveLists })
export const useArchivedLists = () => useQuery({ queryKey: [...shoppingKeys.lists, 'archived'], queryFn: api.getArchivedLists })
export const useMonthlyConsumption = (now = new Date()) => useQuery({
  queryKey: shoppingKeys.archivedWithItems,
  queryFn: api.getArchivedListsWithItems,
  select: (lists) => ({
    current: monthlyConsumption(lists, now),
    previous: monthlyConsumption(lists, new Date(now.getFullYear(), now.getMonth() - 1)),
  }),
})
export const useMonthlyHistory = (monthsCount = 6, now = new Date()) => useQuery({
  queryKey: shoppingKeys.archivedWithItems,
  queryFn: api.getArchivedListsWithItems,
  select: (lists) => {
    const history = getMonthlyHistory(lists, monthsCount, now)
    const stats = getHistoryStats(history)
    return {
      history,
      stats,
      lists,
    }
  },
})
export const useList = (id: string) => useQuery({ queryKey: shoppingKeys.list(id), queryFn: () => api.getList(id) })
export const useItems = (id: string, enabled = true) => useQuery({ queryKey: shoppingKeys.items(id), queryFn: () => api.getItems(id), enabled })

const useInvalidateLists = () => {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: shoppingKeys.lists })
}

const useInvalidateList = () => {
  const client = useQueryClient()
  return (id: string) => Promise.all([
    client.invalidateQueries({ queryKey: shoppingKeys.lists }),
    client.invalidateQueries({ queryKey: shoppingKeys.list(id) }),
    client.invalidateQueries({ queryKey: shoppingKeys.items(id) }),
  ])
}

export const useCreateList = () => {
  const invalidate = useInvalidateLists()
  return useMutation({ mutationFn: ({ name }: { name: string }) => api.createList(name), onSuccess: invalidate })
}

export const useRenameList = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => api.renameList(id, name), onSuccess: (_, { id }) => invalidate(id) })
}

export const useCloneLatestArchivedList = () => {
  const invalidate = useInvalidateLists()
  return useMutation({ mutationFn: api.cloneLatestArchivedList, onSuccess: invalidate })
}

export const useCreateItem = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: ({ listId, name }: { listId: string; name: string }) => api.createItem(listId, name), onSuccess: (_, { listId }) => invalidate(listId) })
}

export const useUpdateItem = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: (item: { id: string; listId: string; quantity: number; price: number }) => api.updateItem(item.id, { quantity: item.quantity, price: item.price }), onSuccess: (_, { listId }) => invalidate(listId) })
}

export const useToggleItem = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: (item: { id: string; listId: string; is_purchased: boolean }) => api.toggleItem(item.id, item.is_purchased), onSuccess: (_, { listId }) => invalidate(listId) })
}

export const useDeleteItem = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: (item: { id: string; listId: string }) => api.deleteItem(item.id), onSuccess: (_, { listId }) => invalidate(listId) })
}

export const useUncheckAllItems = () => {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationFn: (listId: string) => api.uncheckAllItems(listId),
    onSuccess: (_, listId) => invalidate(listId),
  })
}

export const useArchiveList = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: api.archiveList, onSuccess: (_, id) => invalidate(id) })
}

export const useReopenList = () => {
  const invalidate = useInvalidateList()
  return useMutation({ mutationFn: api.reopenList, onSuccess: (_, id) => invalidate(id) })
}
