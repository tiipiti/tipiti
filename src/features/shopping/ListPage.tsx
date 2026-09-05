import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { nameSchema, formatCurrency } from './forms'
import { ItemRow } from './ItemRow'
import { useArchiveList, useCreateItem, useItems, useList, useReopenList } from './queries'
import { purchasedTotal } from './total'

const newItemSchema = z.object({ name: nameSchema })
type NewItemValues = z.infer<typeof newItemSchema>

export function ListPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const list = useList(id)
  const items = useItems(id)
  const createItem = useCreateItem()
  const archive = useArchiveList()
  const reopen = useReopenList()
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewItemValues>({ resolver: zodResolver(newItemSchema), defaultValues: { name: '' } })

  const addItem = async ({ name }: NewItemValues) => {
    try {
      await createItem.mutateAsync({ listId: id, name })
      reset()
      setRetry(null)
    } catch {
      setRetry(() => () => void addItem({ name }))
    }
  }

  const finish = async () => {
    if (!window.confirm('Finalizar esta compra?')) return
    try {
      await archive.mutateAsync(id)
      navigate('/home')
    } catch {
      setRetry(() => () => void finish())
    }
  }

  const reopenCurrentList = async () => {
    try {
      await reopen.mutateAsync(id)
      setRetry(null)
    } catch {
      setRetry(() => () => void reopenCurrentList())
    }
  }

  if (list.isLoading || items.isLoading) return <main className="mx-auto min-h-[100dvh] max-w-xl p-5"><div className="mt-8 h-56 animate-pulse rounded-2xl bg-zinc-200" /></main>
  if (list.error || items.error || !list.data) return <main className="grid min-h-[100dvh] place-items-center p-5"><section className="text-center"><h1 className="text-2xl font-semibold">Lista não encontrada</h1><Link className="mt-4 inline-block text-emerald-700 underline" to="/home">Voltar para listas</Link></section></main>

  const orderedItems = [...(items.data ?? [])].sort((a, b) => Number(a.is_purchased) - Number(b.is_purchased))
  const total = purchasedTotal(items.data ?? [])
  const readOnly = list.data.is_archived

  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl bg-zinc-50 pb-28 text-zinc-950">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-white p-5"><div><Link className="text-sm text-emerald-700 underline" to={readOnly ? '/history' : '/home'}>Voltar</Link><h1 className="mt-2 text-3xl font-semibold tracking-tight">{list.data.name}</h1></div>{readOnly ? <button className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white active:scale-[0.98]" disabled={reopen.isPending} type="button" onClick={() => void reopenCurrentList()}>Reabrir lista</button> : <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium active:scale-[0.98]" disabled={archive.isPending} type="button" onClick={() => void finish()}>Finalizar compra</button>}</header>
      {!readOnly && <form className="grid gap-2 border-b border-zinc-200 bg-white p-5" onSubmit={handleSubmit(addItem)} noValidate><label className="text-sm font-medium" htmlFor="new-item">Adicionar item</label><div className="flex gap-2"><input id="new-item" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="Ex.: arroz" aria-invalid={Boolean(errors.name)} {...register('name')} /><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]" disabled={createItem.isPending} type="submit">Adicionar</button></div><p className="min-h-5 text-sm text-red-700" role="alert">{errors.name?.message}</p></form>}
      {retry && <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>Não foi possível salvar a alteração.</p><button className="mt-2 font-medium underline" type="button" onClick={retry}>Tentar novamente</button></div>}
      {!orderedItems.length ? <p className="px-5 pt-12 text-center text-zinc-600">Nenhum item nesta lista.</p> : <ul className="px-5">{orderedItems.map((item) => <ItemRow key={item.id} item={item} readOnly={readOnly} />)}</ul>}
      <footer className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-xl items-center justify-between"><span className="text-sm text-zinc-600">No carrinho</span><strong>{formatCurrency(total)}</strong></div></footer>
    </main>
  )
}
