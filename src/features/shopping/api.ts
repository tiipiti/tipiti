import { supabase } from '@/lib/supabase'

import type { Item, List } from './types'

const listColumns = 'id, user_id, name, is_archived, created_at, archived_at'
const itemColumns = 'id, list_id, name, quantity, price, is_purchased'

const throwIfError = (error: Error | null) => {
  if (error) throw error
}

const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser()
  throwIfError(error)
  if (!data.user) throw new Error('Sessão não encontrada')
  return data.user.id
}

export const getActiveLists = async () => {
  const { data, error } = await supabase
    .from('lists')
    .select(listColumns)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as List[]
}

export const getArchivedLists = async () => {
  const { data, error } = await supabase
    .from('lists')
    .select(listColumns)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as List[]
}

export const getList = async (id: string) => {
  const { data, error } = await supabase.from('lists').select(listColumns).eq('id', id).maybeSingle()
  throwIfError(error)
  return data as List | null
}

export const getItems = async (listId: string) => {
  const { data, error } = await supabase.from('items').select(itemColumns).eq('list_id', listId)
  throwIfError(error)
  return (data ?? []) as Item[]
}

export const createList = async (name = 'Nova lista') => {
  const user_id = await requireUserId()
  const { data, error } = await supabase.from('lists').insert({ user_id, name }).select(listColumns).single()
  throwIfError(error)
  return data as List
}

export const renameList = async (id: string, name: string) => {
  const { data, error } = await supabase.from('lists').update({ name }).eq('id', id).select(listColumns).single()
  throwIfError(error)
  return data as List
}

export const createItem = async (list_id: string, name: string) => {
  const { data, error } = await supabase
    .from('items')
    .insert({ list_id, name, quantity: 1, price: 0, is_purchased: false })
    .select(itemColumns)
    .single()
  throwIfError(error)
  return data as Item
}

export const updateItem = async (id: string, patch: Pick<Item, 'quantity' | 'price'>) => {
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).select(itemColumns).single()
  throwIfError(error)
  return data as Item
}

export const toggleItem = async (id: string, is_purchased: boolean) => {
  const { data, error } = await supabase.from('items').update({ is_purchased }).eq('id', id).select(itemColumns).single()
  throwIfError(error)
  return data as Item
}

export const deleteItem = async (id: string) => {
  const { error } = await supabase.from('items').delete().eq('id', id)
  throwIfError(error)
}

export const archiveList = async (id: string) => {
  const { data, error } = await supabase
    .from('lists')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', id)
    .select(listColumns)
    .single()
  throwIfError(error)
  return data as List
}

export const reopenList = async (id: string) => {
  const { data, error } = await supabase
    .from('lists')
    .update({ is_archived: false, archived_at: null })
    .eq('id', id)
    .select(listColumns)
    .single()
  throwIfError(error)
  return data as List
}

export const cloneItemPayloads = (
  list_id: string,
  items: Pick<Item, 'name' | 'quantity' | 'price' | 'is_purchased'>[],
) => items.map(({ name, quantity, price }) => ({ list_id, name, quantity, price, is_purchased: false }))

export const cloneLatestArchivedList = async () => {
  const latest = (await getArchivedLists())[0]
  if (!latest) return null

  const copy = await createList(latest.name)
  const items = await getItems(latest.id)
  if (!items.length) return copy

  const { error } = await supabase.from('items').insert(cloneItemPayloads(copy.id, items))
  if (!error) return copy

  await supabase.from('lists').delete().eq('id', copy.id)
  throw error
}
