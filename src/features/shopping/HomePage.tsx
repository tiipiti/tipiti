import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useSession } from '@/features/auth/session'
import { getUserDisplayName } from '@/features/auth/user'
import { nameSchema } from './forms'
import { ListSummary } from './ListSummary'
import { MonthlyBanner } from './MonthlyBanner'
import { PixelCart } from './PixelIcons'
import { AppFooter } from '@/components/AppFooter'
import { ErrorPanel } from '@/components/ErrorPanel'
import { PageHeader } from '@/components/PageHeader'
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

  return (
    <main className="tipiti-page">
      <PageHeader
        brand={displayName ? `Bem-vindo, ${displayName}` : 'Tipiti'}
        title="Listas ativas"
        actions={
          <>
            <Link to="/dashboard" className="tipiti-button py-2 text-xs">Dashboard</Link>
            <Link to="/profile" className="tipiti-button py-2 text-xs" aria-label="Meu Perfil">Perfil</Link>
          </>
        }
      />

      {/* Monthly Consumption Dashboard Link */}
      <MonthlyBanner data={monthly.data} isLoading={monthly.isLoading} />

      {/* Botão + Nova Lista (ou formulário) logo abaixo do banner de consumo */}
      {!creating ? (
        <div className="mt-6">
          <button
            className="tipiti-button tipiti-button-primary w-full py-3 text-sm font-bold uppercase tracking-wider cursor-pointer"
            disabled={create.isPending}
            type="button"
            onClick={() => setCreating(true)}
            aria-label="Nova lista"
          >
            + Nova lista
          </button>
        </div>
      ) : (
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
              placeholder="Ex.: Compras da semana"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            <button
              className="tipiti-button tipiti-button-primary cursor-pointer"
              disabled={create.isPending}
              type="submit"
            >
              Criar lista
            </button>
            <button
              className="tipiti-button cursor-pointer"
              type="button"
              onClick={() => {
                setCreating(false)
                reset()
              }}
            >
              Cancelar
            </button>
          </div>
          <p className="min-h-5 text-xs font-bold text-[#FF5F1F]" role="alert">
            {errors.name?.message}
          </p>
        </form>
      )}

      {error && (
        <ErrorPanel
          className="mt-6"
          message={error.message}
          onRetry={() => void (retry ? retry() : clone.error ? cloneList() : active.refetch())}
        />
      )}

      {!active.data?.length ? (
        <section className="tipiti-panel mt-6 text-center">
          <div className="flex justify-center">
            <PixelCart width={48} height={48} />
          </div>
          <h2 className="mt-4 font-['Impact','Arial_Black',sans-serif] text-xl uppercase tracking-tight text-black">
            Sua próxima compra começa aqui.
          </h2>
          <p className="mt-2 text-sm font-bold text-black">
            Crie uma lista acima para adicionar seus itens.
          </p>
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
            {clone.isPending ? 'Copiando...' : `Copiar última compra (${archived.data[0].name})`}
          </button>
        </div>
      ) : null}

      <AppFooter />
    </main>
  )
}
