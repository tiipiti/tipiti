import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useSession } from '@/features/auth/session'
import { getUserDisplayName } from '@/features/auth/user'
import { formatCurrency, nameSchema } from './forms'
import { ListSummary } from './ListSummary'
import { monthDifference } from './monthly'
import { PixelCart, PixelCoin } from './PixelIcons'
import {
  useActiveLists,
  useArchivedLists,
  useCloneLatestArchivedList,
  useCreateList,
  useMonthlyConsumption,
} from './queries'

type NewListValues = { name: string }
const newListSchema = z.object({ name: nameSchema })

function LoadSkeleton() {
  return (
    <div className="mt-8 grid gap-4">
      <div className="tipiti-skeleton h-28" />
      <div className="tipiti-skeleton h-20" />
      <div className="tipiti-skeleton h-20" />
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const displayName = getUserDisplayName(session?.user)
  const active = useActiveLists()
  const archived = useArchivedLists()
  const monthly = useMonthlyConsumption()
  const create = useCreateList()
  const clone = useCloneLatestArchivedList()
  const [creating, setCreating] = useState(false)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewListValues>({
    resolver: zodResolver(newListSchema),
    defaultValues: { name: '' },
  })

  const createList = async ({ name }: NewListValues) => {
    try {
      const list = await create.mutateAsync({ name })
      reset()
      setCreating(false)
      setRetry(null)
      navigate(`/list/${list.id}`)
    } catch {
      setRetry(() => () => void createList({ name }))
    }
  }

  const cloneList = async () => {
    try {
      const list = await clone.mutateAsync()
      if (list) {
        setRetry(null)
        navigate(`/list/${list.id}`)
      }
    } catch {
      setRetry(() => () => void cloneList())
    }
  }

  if (active.isLoading) {
    return (
      <main className="tipiti-page">
        <LoadSkeleton />
      </main>
    )
  }

  const error = active.error ?? archived.error ?? monthly.error ?? create.error ?? clone.error

  const now = new Date()
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(prevDate)

  const currentTotal = monthly.data?.current.total ?? 0
  const currentPurchases = monthly.data?.current.purchases ?? 0
  const previousTotal = monthly.data?.previous.total ?? 0
  const diff = monthDifference(currentTotal, previousTotal)

  const diffText =
    diff > 0
      ? `${formatCurrency(diff)} a mais que ${prevMonthName}`
      : diff < 0
        ? `${formatCurrency(Math.abs(diff))} a menos que ${prevMonthName}`
        : 'IGUAL AO MÊS PASSADO'

  return (
    <main className="tipiti-page">
      <header className="flex items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-black">
            {displayName ? `Bem-vindo, ${displayName}` : 'Tipiti'}
          </p>
          <h1 className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
            Listas ativas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/history" className="tipiti-button py-2 text-xs">
            Histórico
          </Link>
          {active.data?.length ? (
            <button
              className="tipiti-button tipiti-button-primary py-2 text-xs"
              disabled={create.isPending}
              type="button"
              onClick={() => setCreating(true)}
            >
              Nova lista
            </button>
          ) : null}
        </div>
      </header>

      {/* Monthly Consumption Dashboard */}
      {monthly.isLoading ? (
        <div className="tipiti-skeleton mt-6 h-28" />
      ) : monthly.data ? (
        <section className="tipiti-panel tipiti-panel-yellow tipiti-panel-action mt-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                Consumo do mês
              </h2>
              <p className="mt-1 font-['Impact','Arial_Black',sans-serif] text-3xl font-black uppercase text-black">
                {formatCurrency(currentTotal)}
              </p>
            </div>
            <PixelCoin width={32} height={32} />
          </div>
          <div className="mt-3 border-t-2 border-black pt-2 text-xs font-bold uppercase tracking-wide text-black">
            <p>
              {currentPurchases} {currentPurchases === 1 ? 'COMPRA FINALIZADA' : 'COMPRAS FINALIZADAS'}
            </p>
            <p className="mt-0.5">{diffText}</p>
          </div>
        </section>
      ) : null}

      {creating && (
        <form
          className="tipiti-panel tipiti-panel-action mt-6 grid gap-3"
          onSubmit={handleSubmit(createList)}
          noValidate
        >
          <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="list-name">
            Nome da lista
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="list-name"
              className="tipiti-input flex-1"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            <button
              className="tipiti-button tipiti-button-primary"
              disabled={create.isPending}
              type="submit"
            >
              Criar lista
            </button>
          </div>
          <p className="min-h-5 text-xs font-bold text-[#FF5F1F]" role="alert">
            {errors.name?.message}
          </p>
        </form>
      )}

      {error && (
        <div className="tipiti-panel tipiti-panel-orange mt-6 text-sm text-black">
          <p className="font-bold">{error.message}</p>
          <button
            className="mt-2 font-bold underline"
            type="button"
            onClick={() => void (retry ? retry() : clone.error ? cloneList() : active.refetch())}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!active.data?.length ? (
        <section className="tipiti-panel mt-8 text-center">
          <div className="flex justify-center">
            <PixelCart width={48} height={48} />
          </div>
          <h2 className="mt-4 font-['Impact','Arial_Black',sans-serif] text-xl uppercase tracking-tight text-black">
            Sua próxima compra começa aqui.
          </h2>
          <p className="mt-2 text-sm font-bold text-black">
            Crie uma lista para adicionar seus itens.
          </p>
          {!creating && (
            <button
              className="tipiti-button tipiti-button-primary mt-6"
              disabled={create.isPending}
              type="button"
              onClick={() => setCreating(true)}
            >
              Nova lista
            </button>
          )}
        </section>
      ) : (
        <section className="mt-6 grid gap-4">
          {active.data.map((list) => (
            <ListSummary key={list.id} list={list} />
          ))}
        </section>
      )}

      {archived.data?.length ? (
        <div className="mt-8">
          <button
            className="tipiti-button w-full"
            disabled={clone.isPending}
            type="button"
            onClick={() => void cloneList()}
          >
            Copiar última compra
          </button>
        </div>
      ) : null}
    </main>
  )
}
