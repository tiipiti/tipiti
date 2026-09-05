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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenameValues>({
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
    <article className="tipiti-panel tipiti-panel-action">
      {editing ? (
        <form className="grid gap-3" onSubmit={handleSubmit(submitRename)} noValidate>
          <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor={`name-${list.id}`}>
            Nome da lista
          </label>
          <input
            id={`name-${list.id}`}
            className="tipiti-input"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <p className="min-h-5 text-xs font-bold text-[#FF5F1F]" role="alert">
            {errors.name?.message}
          </p>
          {rename.error && (
            <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
              {rename.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              className="tipiti-button tipiti-button-primary py-2 text-xs"
              disabled={rename.isPending}
              type="submit"
            >
              Salvar
            </button>
            <button
              className="tipiti-button py-2 text-xs"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <Link
            className="min-w-0 flex-1 outline-none focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-offset-2"
            to={`/list/${list.id}`}
          >
            <h2 className="truncate font-bold uppercase tracking-tight text-lg text-black">{list.name}</h2>
            {history && (
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black">
                {items.isLoading
                  ? 'Calculando total...'
                  : formatCurrency(purchasedTotal(items.data ?? []))}{' '}
                · {list.archived_at && formatDate(list.archived_at)}
              </p>
            )}
          </Link>
          {!history && (
            <button
              className="tipiti-button py-1 px-3 text-xs"
              type="button"
              onClick={() => setEditing(true)}
            >
              Renomear
            </button>
          )}
        </div>
      )}
    </article>
  )
}
