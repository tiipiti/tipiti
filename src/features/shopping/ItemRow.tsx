import { zodResolver } from '@hookform/resolvers/zod'
import { Fragment, useState } from 'react'
import { useForm } from 'react-hook-form'

import { formatCurrency, itemSchema } from './forms'
import { PixelCheck } from './PixelIcons'
import { useDeleteItem, useToggleItem, useUpdateItem } from './queries'
import type { Item } from './types'

export function ItemRow({ item, readOnly }: { item: Item; readOnly: boolean }) {
  const [editing, setEditing] = useState(false)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const toggle = useToggleItem()
  const update = useUpdateItem()
  const remove = useDeleteItem()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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
              <button
                className="tipiti-button tipiti-button-sm tipiti-button-secondary cursor-pointer"
                type="button"
                onClick={() => setEditing((value) => !value)}
              >
                Editar
              </button>
              <button
                className="tipiti-button tipiti-button-sm tipiti-button-warning cursor-pointer"
                disabled={remove.isPending}
                type="button"
                onClick={() => void deleteCurrentItem()}
              >
                Excluir
              </button>
            </div>
          )}
        </td>
        <td className="p-3 align-top text-sm font-bold text-black">{item.quantity}</td>
        <td className="p-3 align-top text-sm font-bold text-black">{formatCurrency(item.price)}</td>
        <td className="p-3 align-top">
          <button
            className={`tipiti-status ${item.is_purchased ? 'bg-[#D6D0C8]' : 'bg-white'}`}
            aria-label={`Marcar ${item.name} como ${item.is_purchased ? 'pendente' : 'comprado'}`}
            aria-pressed={item.is_purchased}
            disabled={readOnly || toggle.isPending}
            type="button"
            onClick={() => void toggleItem()}
          >
            {item.is_purchased ? (
              <PixelCheck width={14} height={14} />
            ) : (
              <span
                className="inline-block h-3.5 w-3.5 border-2 border-black bg-white"
                aria-hidden="true"
              />
            )}
            <span>{item.is_purchased ? 'COMPRADO' : 'PENDENTE'}</span>
          </button>
        </td>
      </tr>

      {editing && !readOnly && (
        <tr className="border-b-[3px] border-black bg-[#F4F0EB]">
          <td className="p-3" colSpan={4}>
            <form
              className="tipiti-panel tipiti-panel-action grid grid-cols-2 gap-3"
              onSubmit={handleSubmit(saveItem)}
              noValidate
            >
              <div className="grid gap-1">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-black"
                  htmlFor={`quantity-${item.id}`}
                >
                  Quantidade
                </label>
                <input
                  id={`quantity-${item.id}`}
                  className="tipiti-input text-sm"
                  inputMode="decimal"
                  max={99999}
                  maxLength={8}
                  aria-invalid={Boolean(errors.quantity)}
                  {...register('quantity')}
                />
                <p className="min-h-4 text-xs font-bold text-[#FF5F1F]">
                  {errors.quantity?.message}
                </p>
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-black"
                  htmlFor={`price-${item.id}`}
                >
                  Preço unitário
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
              <div className="col-span-2 flex gap-2 pt-2">
                <button
                  className="tipiti-button tipiti-button-primary py-2 text-xs"
                  disabled={update.isPending}
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
    </Fragment>
  )
}
