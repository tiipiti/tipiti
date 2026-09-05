import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { nameSchema } from './forms'
import { ListSummary } from './ListSummary'
import { useActiveLists, useArchivedLists, useCloneLatestArchivedList, useCreateList } from './queries'

type NewListValues = { name: string }
const newListSchema = z.object({ name: nameSchema })

function LoadSkeleton() {
  return <div className="mt-8 grid gap-3"><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /></div>
}

export function HomePage() {
  const navigate = useNavigate()
  const active = useActiveLists()
  const archived = useArchivedLists()
  const create = useCreateList()
  const clone = useCloneLatestArchivedList()
  const [creating, setCreating] = useState(false)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewListValues>({ resolver: zodResolver(newListSchema), defaultValues: { name: '' } })

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

  if (active.isLoading) return <main className="mx-auto min-h-[100dvh] max-w-xl p-5"><LoadSkeleton /></main>

  const error = active.error ?? archived.error ?? create.error ?? clone.error
  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl bg-zinc-50 p-5 text-zinc-950">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div><p className="text-sm font-medium text-emerald-700">Tipiti</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Listas ativas</h1></div>
        {active.data?.length ? <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60" disabled={create.isPending} type="button" onClick={() => setCreating(true)}>Nova lista</button> : null}
      </header>
      {creating && <form className="mt-4 grid gap-2 rounded-xl border border-zinc-200 bg-white p-4" onSubmit={handleSubmit(createList)} noValidate><label className="text-sm font-medium" htmlFor="list-name">Nome da lista</label><div className="flex gap-2"><input id="list-name" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" aria-invalid={Boolean(errors.name)} {...register('name')} /><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]" disabled={create.isPending} type="submit">Criar lista</button></div><p className="min-h-5 text-sm text-red-700" role="alert">{errors.name?.message}</p></form>}
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error.message}</p><button className="mt-2 font-medium underline" type="button" onClick={() => void (retry ? retry() : clone.error ? cloneList() : active.refetch())}>Tentar novamente</button></div>}
      {!active.data?.length ? <section className="mt-14 text-center"><h2 className="text-xl font-medium">Sua próxima compra começa aqui.</h2><p className="mt-2 text-sm text-zinc-600">Crie uma lista para adicionar seus itens.</p>{!creating && <button className="mt-5 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium active:scale-[0.98]" disabled={create.isPending} type="button" onClick={() => setCreating(true)}>Nova lista</button>}</section> : <section className="mt-4">{active.data.map((list) => <ListSummary key={list.id} list={list} />)}</section>}
      {archived.data?.length ? <button className="mt-6 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium active:scale-[0.98] disabled:opacity-60" disabled={clone.isPending} type="button" onClick={() => void cloneList()}>Copiar última compra</button> : null}
    </main>
  )
}
