import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { formatCurrency, nameSchema } from './forms'
import { ItemRow } from './ItemRow'
import { PixelCoin } from './PixelIcons'
import { useArchiveList, useCreateItem, useItems, useList, useReopenList, useUncheckAllItems } from './queries'
import { purchasedTotal } from './total'
import { ConfirmModal } from '@/components/ConfirmModal'

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
  const uncheckAll = useUncheckAllItems()
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  const orderedItems = useMemo(
    () =>
      [...(items.data ?? [])].sort(
        (a, b) => Number(a.is_purchased) - Number(b.is_purchased),
      ),
    [items.data],
  )
  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return orderedItems
    const q = filterQuery.toLowerCase().trim()
    return orderedItems.filter((i) => i.name.toLowerCase().includes(q))
  }, [orderedItems, filterQuery])

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

  const finish = () => {
    setConfirmFinishOpen(true)
  }

  const onConfirmFinish = async () => {
    try {
      await archive.mutateAsync(id)
      setConfirmFinishOpen(false)
      navigate('/home')
    } catch {
      setRetry(() => () => void onConfirmFinish())
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

  const allPurchased = orderedItems.length > 0 && orderedItems.every((item) => item.is_purchased)
  const total = purchasedTotal(items.data ?? [])
  const readOnly = list.data.is_archived
  const pendingCount = (items.data ?? []).filter((item) => !item.is_purchased).length
  const confirmTitle =
    pendingCount > 0 ? 'Finalizar lista com pendência?' : 'Finalizar esta compra?'
  const confirmMessage =
    pendingCount > 0
      ? pendingCount === 1
        ? 'Ficou 1 item pendente. Vai ficar pendente? Deseja finalizar toda a lista?'
        : `Ficaram ${pendingCount} itens pendentes. Vão ficar pendentes? Deseja finalizar toda a lista?`
      : 'Deseja finalizar esta compra e arquivar a lista?'

  return (
    <main className="tipiti-page pb-44">
      <header className="sticky top-0 z-30 -mx-5 border-b-4 border-black bg-[#F4F0EB] px-5 pb-3 pt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              className="tipiti-button tipiti-button-sm tipiti-button-secondary font-bold"
              to={readOnly ? '/history' : '/home'}
            >
              ← SALVAR E VOLTAR
            </Link>
            <h1 className="mt-2 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
              {list.data.name}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
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
              <>
                {items.data?.some((i) => i.is_purchased) && (
                  <button
                    className="tipiti-button tipiti-button-sm tipiti-button-yellow py-2 px-3 text-xs font-bold"
                    disabled={uncheckAll.isPending}
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                  >
                    Desmarcar comprados
                  </button>
                )}
                <button
                  className="tipiti-button tipiti-button-warning py-2 px-3 text-xs"
                  disabled={archive.isPending}
                  type="button"
                  onClick={() => void finish()}
                >
                  Finalizar compra
                </button>
              </>
            )}
          </div>
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

      {allPurchased && !readOnly && (
        <div className="tipiti-panel tipiti-panel-green mt-6 flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div>
            <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">
              ★ CARRINHO CHEIO!
            </p>
            <p className="text-xs font-bold uppercase text-black mt-0.5">
              Todos os itens foram marcados como comprados. Pronto para passar no caixa!
            </p>
          </div>
          <button
            type="button"
            className="tipiti-button tipiti-button-warning text-xs font-bold py-2 px-3 shrink-0 cursor-pointer"
            disabled={archive.isPending}
            onClick={() => void finish()}
          >
            Finalizar compra agora
          </button>
        </div>
      )}

      {orderedItems.length > 3 && (
        <div className="mt-4 flex items-center gap-2 border-4 border-black bg-white p-2">
          <span className="tipiti-pixel text-xs font-bold uppercase text-black pl-1">
            BUSCA:
          </span>
          <input
            type="text"
            className="flex-1 bg-transparent text-xs font-bold text-black outline-none placeholder:text-black/50"
            placeholder="Filtrar produtos na lista..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="tipiti-button tipiti-button-sm py-1 px-2 text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {!orderedItems.length ? (
        <div className="tipiti-panel mt-8 text-center font-bold uppercase text-black">
          <p>Nenhum item nesta lista.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="tipiti-panel mt-8 text-center font-bold uppercase text-black">
          <p>Nenhum produto encontrado com "{filterQuery}".</p>
          <button
            type="button"
            onClick={() => setFilterQuery('')}
            className="tipiti-button tipiti-button-sm mt-3"
          >
            Limpar busca
          </button>
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
              {filteredItems.map((item) => (
                <ItemRow key={item.id} item={item} readOnly={readOnly} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Solid ink bottom bar, NO backdrop-blur */}
      <footer
        className="fixed inset-x-0 bottom-0 border-t-4 border-black bg-[#F4F0EB] p-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2">
            <PixelCoin width={24} height={24} />
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              No carrinho
            </span>
          </div>
          <strong className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black text-black tabular-nums">
            {formatCurrency(total)}
          </strong>
        </div>
      </footer>

      <ConfirmModal
        open={confirmFinishOpen}
        title={confirmTitle}
        message={confirmMessage}
        variant={pendingCount > 0 ? 'warning' : 'default'}
        confirmText={pendingCount > 0 ? 'Sim, finalizar toda a lista' : 'Sim, finalizar'}
        cancelText="Voltar para a lista"
        isPending={archive.isPending}
        onConfirm={() => void onConfirmFinish()}
        onCancel={() => setConfirmFinishOpen(false)}
      />

      <ConfirmModal
        open={confirmResetOpen}
        title="Desmarcar Comprados"
        message="Deseja desmarcar todos os itens comprados para reiniciar a lista para sua próxima ida ao mercado? Os itens e preços continuarão salvos."
        confirmText="Sim, Desmarcar Todos"
        cancelText="Voltar"
        variant="warning"
        isPending={uncheckAll.isPending}
        onConfirm={async () => {
          await uncheckAll.mutateAsync(id)
          setConfirmResetOpen(false)
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </main>
  )
}
