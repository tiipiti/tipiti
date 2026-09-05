import { zodResolver } from '@hookform/resolvers/zod'
import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'

import { formatCurrency, itemSchema } from './forms'
import { useDeleteItem, useToggleItem, useUpdateItem } from './queries'
import type { Item } from './types'

export function ItemRow({ item, readOnly }: { item: Item; readOnly: boolean }) {
  const [editing, setEditing] = useState(false)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const toggle = useToggleItem()
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: { quantity: item.quantity, price: item.price },
  })

  const toggleItem = async () => {
    try {
      await toggle.mutateAsync({ id: item.id, listId: item.list_id, is_purchased: !item.is_purchased })
      setRetry(null)
    } catch {
      setRetry(() => () => void toggleItem())
    }
  }

  const saveItem = async (values: { quantity: number; price: number }) => {
    try {
      await update.mutateAsync({ id: item.id, listId: item.list_id, ...values })
      setEditing(false)
      setRetry(null)
    } catch {
      setRetry(() => () => void saveItem(values))
    }
  }

  const deleteCurrentItem = async () => {
    try {
      await remove.mutateAsync({ id: item.id, listId: item.list_id })
      setRetry(null)
    } catch {
      setRetry(() => () => void deleteCurrentItem())
    }
  }

  return <Fragment>
    <tr className="border-b border-zinc-200" data-testid="item-row">
      <td className="py-3"><span className={item.is_purchased ? 'text-zinc-500 line-through' : 'font-medium'}>{item.name}</span>{!readOnly && <div className="mt-1 flex gap-2"><button className="text-sm text-zinc-600 underline" type="button" onClick={() => setEditing((value) => !value)}>Editar</button><button className="text-sm text-red-700 underline" disabled={remove.isPending} type="button" onClick={() => void deleteCurrentItem()}>Excluir</button></div>}</td>
      <td className="py-3 align-top text-sm text-zinc-600">{item.quantity}</td>
      <td className="py-3 align-top text-sm text-zinc-600">{formatCurrency(item.price)}</td>
      <td className="py-3 align-top"><button className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium active:scale-[0.98]" aria-label={`Marcar ${item.name} como ${item.is_purchased ? 'pendente' : 'comprado'}`} aria-pressed={item.is_purchased} disabled={readOnly || toggle.isPending} type="button" onClick={() => void toggleItem()}>{item.is_purchased ? 'COMPRADO' : 'PENDENTE'}</button></td>
    </tr>
    {editing && !readOnly && <tr><td className="pb-3" colSpan={4}><form className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-100 p-3" onSubmit={handleSubmit(saveItem)} noValidate>
      <div className="grid gap-2"><label className="text-sm font-medium" htmlFor={`quantity-${item.id}`}>Quantidade</label><input id={`quantity-${item.id}`} className="rounded-lg border border-zinc-300 bg-white px-2 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" inputMode="decimal" aria-invalid={Boolean(errors.quantity)} {...register('quantity')} /><p className="min-h-5 text-xs text-red-700">{errors.quantity?.message}</p></div>
      <div className="grid gap-2"><label className="text-sm font-medium" htmlFor={`price-${item.id}`}>Preço unitário</label><input id={`price-${item.id}`} className="rounded-lg border border-zinc-300 bg-white px-2 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" inputMode="decimal" aria-invalid={Boolean(errors.price)} {...register('price')} /><p className="min-h-5 text-xs text-red-700">{errors.price?.message}</p></div>
      <div className="col-span-2 flex gap-2"><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white active:scale-[0.98]" disabled={update.isPending} type="submit">Salvar</button><button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm active:scale-[0.98]" type="button" onClick={() => setEditing(false)}>Cancelar</button></div>
    </form></td></tr>}
    {retry && <tr><td className="pb-3" colSpan={4}><button className="text-sm font-medium text-red-700 underline" type="button" onClick={retry}>Tentar novamente</button></td></tr>}
  </Fragment>
}
