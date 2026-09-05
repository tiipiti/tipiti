import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { formatCurrency, formatDate, nameSchema } from './forms'
import { useItems, useRenameList } from './queries'
import { purchasedTotal } from './total'
import type { List } from './types'

const renameSchema = z.object({ name: nameSchema })
type RenameValues = z.infer<typeof renameSchema>

export function ListSummary({ list, history = false }: { list: List; history?: boolean }) {
  const [editing, setEditing] = useState(false)
  const items = useItems(list.id, history)
  const rename = useRenameList()
  const { register, handleSubmit, formState: { errors } } = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: list.name },
  })

  const submitRename = async ({ name }: RenameValues) => {
    try {
      await rename.mutateAsync({ id: list.id, name })
      setEditing(false)
    } catch {}
  }

  return (
    <article className="border-b border-zinc-200 py-4">
      {editing ? (
        <form className="grid gap-2" onSubmit={handleSubmit(submitRename)} noValidate>
          <label className="text-sm font-medium" htmlFor={`name-${list.id}`}>Nome da lista</label>
          <input id={`name-${list.id}`} className="rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" aria-invalid={Boolean(errors.name)} {...register('name')} />
          <p className="min-h-5 text-sm text-red-700" role="alert">{errors.name?.message}</p>
          {rename.error && <p className="text-sm text-red-700" role="alert">{rename.error.message}</p>}
          <div className="flex gap-2">
            <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white active:scale-[0.98]" disabled={rename.isPending} type="submit">Salvar</button>
            <button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm active:scale-[0.98]" type="button" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <Link className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" to={`/list/${list.id}`}>
            <h2 className="truncate font-medium">{list.name}</h2>
            {history && (
              <p className="mt-1 text-sm text-zinc-600">
                {items.isLoading ? 'Calculando total...' : formatCurrency(purchasedTotal(items.data ?? []))} · {list.archived_at && formatDate(list.archived_at)}
              </p>
            )}
          </Link>
          {!history && <button className="rounded-lg px-2 py-1 text-sm text-zinc-600 active:scale-[0.98]" type="button" onClick={() => setEditing(true)}>Renomear</button>}
        </div>
      )}
    </article>
  )
}
