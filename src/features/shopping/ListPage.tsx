import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { formatCurrency, nameSchema } from './forms'
import { ItemRow } from './ItemRow'
import { PixelCoin } from './PixelIcons'
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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewItemValues>({
    resolver: zodResolver(newItemSchema),
    defaultValues: { name: '' },
  })
  const { ref: newItemRef, ...newItemInput } = register('name')

  const setMergedInputRef = useCallback((element: HTMLInputElement | null) => {
    newItemRef(element)
    inputRef.current = element
  }, [newItemRef])

  const addItem = async ({ name }: NewItemValues) => {
    try {
      await createItem.mutateAsync({ listId: id, name })
      reset()
      inputRef.current?.focus()
      setRetry(null)
    } catch {
      setRetry(() => () => void addItem({ name }))
    }
  }

  const finish = async () => {
    const pendingCount = (items.data ?? []).filter((item) => !item.is_purchased).length
    if (pendingCount > 0) {
      const message =
        pendingCount === 1
          ? 'Ficou 1 item pendente. Vai ficar pendente? Deseja finalizar toda a lista?'
          : `Ficaram ${pendingCount} itens pendentes. Vão ficar pendentes? Deseja finalizar toda a lista?`
      if (!window.confirm(message)) return
    } else {
      if (!window.confirm('Finalizar esta compra?')) return
    }

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

  if (list.isLoading || items.isLoading) {
    return (
      <main className="tipiti-page">
        <div className="tipiti-skeleton mt-8 h-56" />
      </main>
    )
  }

  if (list.error || items.error || !list.data) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#F4F0EB] p-5">
        <section className="tipiti-panel text-center">
          <h1 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase tracking-tight text-black">
            Lista não encontrada
          </h1>
          <Link className="tipiti-button mt-4" to="/home">
            Voltar para listas
          </Link>
        </section>
      </main>
    )
  }

  const orderedItems = [...(items.data ?? [])].sort(
    (a, b) => Number(a.is_purchased) - Number(b.is_purchased),
  )
  const total = purchasedTotal(items.data ?? [])
  const readOnly = list.data.is_archived

  return (
    <main className="tipiti-page pb-32">
      <header className="border-b-4 border-black pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              className="tipiti-button tipiti-button-sm tipiti-button-secondary"
              to={readOnly ? '/history' : '/home'}
            >
              &lt; VOLTAR
            </Link>
            <h1 className="mt-2 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
              {list.data.name}
            </h1>
          </div>
          {readOnly ? (
            <button
              className="tipiti-button tipiti-button-primary py-2 px-3 text-xs"
              disabled={reopen.isPending}
              type="button"
              onClick={() => void reopenCurrentList()}
            >
              Reabrir lista
            </button>
          ) : (
            <button
              className="tipiti-button tipiti-button-warning py-2 px-3 text-xs"
              disabled={archive.isPending}
              type="button"
              onClick={() => void finish()}
            >
              Finalizar compra
            </button>
          )}
        </div>
      </header>

      {!readOnly && (
        <form
          className="tipiti-panel tipiti-panel-action mt-6 grid gap-3"
          onSubmit={(e) => {
            void handleSubmit(addItem)(e)
          }}
          noValidate
        >
          <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="new-item">
            Adicionar item
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="new-item"
              className="tipiti-input flex-1"
              placeholder="Ex.: arroz"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              {...newItemInput}
              ref={setMergedInputRef}
            />
            <button
              className="tipiti-button tipiti-button-primary shrink-0 sm:self-stretch"
              disabled={createItem.isPending}
              type="submit"
            >
              Adicionar
            </button>
          </div>
          <p className="min-h-5 text-xs font-bold text-[#FF5F1F]" role="alert">
            {errors.name?.message}
          </p>
        </form>
      )}

      {retry && (
        <div className="tipiti-panel tipiti-panel-orange mt-6 text-sm text-black">
          <p className="font-bold">Não foi possível salvar a alteração.</p>
          <button className="mt-2 font-bold underline cursor-pointer" type="button" onClick={retry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!orderedItems.length ? (
        <div className="tipiti-panel mt-8 text-center font-bold uppercase text-black">
          <p>Nenhum item nesta lista.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border-4 border-black bg-[#F4F0EB]">
          <table className="tipiti-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>QTD</th>
                <th>PREÇO</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orderedItems.map((item) => (
                <ItemRow key={item.id} item={item} readOnly={readOnly} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Solid ink bottom bar, NO backdrop-blur */}
      <footer className="fixed inset-x-0 bottom-0 border-t-4 border-black bg-[#F4F0EB] p-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2">
            <PixelCoin width={24} height={24} />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              No carrinho
            </span>
          </div>
          <strong className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black text-black">
            {formatCurrency(total)}
          </strong>
        </div>
      </footer>
    </main>
  )
}
