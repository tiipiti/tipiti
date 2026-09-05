import { zodResolver } from '@hookform/resolvers/zod'
import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfirmModal } from '@/components/ConfirmModal'
import { triggerHaptic } from '@/lib/haptic'
import { editItemPriceSchema, formatCurrency } from './forms'
import { PixelCheck } from './PixelIcons'
import { useDeleteItem, useToggleItem, useUpdateItem } from './queries'
import type { Item } from './types'

export function ItemRow({ item, readOnly }: { item: Item; readOnly: boolean }) {
  const [editing, setEditing] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const toggle = useToggleItem()
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editItemPriceSchema),
    defaultValues: { price: item.price },
  })

  const toggleItem = async () => {
    triggerHaptic(item.is_purchased ? 15 : 35)
    setEditing(false)
    try {
      await toggle.mutateAsync({ id: item.id, listId: item.list_id, is_purchased: !item.is_purchased })
      setRetry(null)
    } catch {
      setRetry(() => () => void toggleItem())
    }
  }

  const adjustQuantity = async (delta: number) => {
    const newQty = Math.max(1, Math.min(99999, Math.round((item.quantity + delta) * 100) / 100))
    if (newQty === item.quantity) return
    triggerHaptic(20)
    try {
      await update.mutateAsync({ id: item.id, listId: item.list_id, quantity: newQty, price: item.price })
      setRetry(null)
    } catch {
      setRetry(() => () => void adjustQuantity(delta))
    }
  }

  const savePrice = async ({ price }: { price: number }) => {
    try {
      await update.mutateAsync({ id: item.id, listId: item.list_id, quantity: item.quantity, price })
      setEditing(false)
      setRetry(null)
    } catch {
      setRetry(() => () => void savePrice({ price }))
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

  return (
    <Fragment>
      <tr
        className={`border-b-[3px] border-black transition-colors ${
          item.is_purchased ? 'bg-[#D6D0C8]' : 'bg-[#F4F0EB]'
        }`}
        data-testid="item-row"
      >
        <td className="p-3">
          <span className={`font-bold uppercase text-black ${item.is_purchased ? 'line-through' : ''}`}>
            {item.name}
          </span>
          {!readOnly && (
            <div className="mt-2 flex gap-2 text-xs font-bold uppercase">
              {!item.is_purchased && (
                <button
                  className="tipiti-button tipiti-button-sm tipiti-button-secondary cursor-pointer"
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                >
                  Editar
                </button>
              )}
              <button
                className="tipiti-button tipiti-button-sm tipiti-button-warning cursor-pointer"
                disabled={remove.isPending}
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Excluir
              </button>
            </div>
          )}
        </td>
        <td className="p-3 align-top text-sm font-bold text-black tabular-nums">
          {readOnly || item.is_purchased ? (
            item.quantity
          ) : (
            <div className="inline-flex items-center gap-1 border-2 border-black bg-[#F4F0EB] p-0.5">
              <button
                type="button"
                disabled={update.isPending || item.quantity <= 1}
                className="flex h-6 w-6 items-center justify-center border border-black bg-white text-xs font-black transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label={`Diminuir quantidade de ${item.name}`}
                onClick={() => void adjustQuantity(-1)}
              >
                -
              </button>
              <span className="min-w-[1.5rem] text-center font-bold tabular-nums">
                {item.quantity}
              </span>
              <button
                type="button"
                disabled={update.isPending || item.quantity >= 99999}
                className="flex h-6 w-6 items-center justify-center border border-black bg-white text-xs font-black transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label={`Aumentar quantidade de ${item.name}`}
                onClick={() => void adjustQuantity(1)}
              >
                +
              </button>
            </div>
          )}
        </td>
        <td className="p-3 align-top text-sm font-bold text-black tabular-nums">{formatCurrency(item.price)}</td>
        <td className="p-3 align-top text-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={item.is_purchased}
            aria-label={`Marcar ${item.name} como ${item.is_purchased ? 'não comprado' : 'comprado'}`}
            disabled={readOnly || toggle.isPending}
            onClick={() => void toggleItem()}
            className={`inline-flex h-8 w-8 items-center justify-center border-[3px] border-black transition-all cursor-pointer ${
              item.is_purchased
                ? 'bg-[#39FF14] shadow-[2px_2px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
                : 'bg-white shadow-[3px_3px_0_#000000] hover:bg-[#39FF14]/20 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
            }`}
          >
            {item.is_purchased ? <PixelCheck width={18} height={18} /> : null}
          </button>
        </td>
      </tr>

      {editing && !readOnly && !item.is_purchased && (
        <tr className="border-b-[3px] border-black bg-[#F4F0EB]">
          <td className="p-3" colSpan={4}>
            <form
              className="tipiti-panel tipiti-panel-action flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleSubmit(savePrice)}
              noValidate
            >
              <div className="grid flex-1 gap-1">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-black"
                  htmlFor={`price-${item.id}`}
                >
                  Preço unitário (R$)
                </label>
                <input
                  id={`price-${item.id}`}
                  className="tipiti-input text-sm"
                  inputMode="decimal"
                  max={999999.99}
                  maxLength={12}
                  aria-invalid={Boolean(errors.price)}
                  {...register('price')}
                />
                <p className="min-h-4 text-xs font-bold text-[#FF5F1F]">
                  {errors.price?.message}
                </p>
              </div>
              <div className="flex gap-2 pb-5 sm:pb-0">
                <button
                  className="tipiti-button tipiti-button-primary py-2 px-4 text-xs cursor-pointer"
                  disabled={update.isPending}
                  type="submit"
                >
                  Salvar
                </button>
                <button
                  className="tipiti-button py-2 px-3 text-xs cursor-pointer"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}

      {retry && (
        <tr className="border-b-[3px] border-black bg-[#FF5F1F]/20">
          <td className="p-3" colSpan={4}>
            <button
              className="text-xs font-bold uppercase underline text-black cursor-pointer"
              type="button"
              onClick={retry}
            >
              Tentar novamente
            </button>
          </td>
        </tr>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Excluir Item"
        message={`Deseja remover "${item.name}" da lista? Esta ação não pode ser desfeita.`}
        variant="danger"
        confirmText="Sim, Excluir"
        cancelText="Voltar"
        isPending={remove.isPending}
        onConfirm={async () => {
          await deleteCurrentItem()
          setConfirmDeleteOpen(false)
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </Fragment>
  )
}
