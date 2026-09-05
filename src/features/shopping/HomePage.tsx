import { useNavigate } from 'react-router-dom'

import { ListSummary } from './ListSummary'
import { useActiveLists, useArchivedLists, useCloneLatestArchivedList, useCreateList } from './queries'

function LoadSkeleton() {
  return <div className="mt-8 grid gap-3"><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /></div>
}

export function HomePage() {
  const navigate = useNavigate()
  const active = useActiveLists()
  const archived = useArchivedLists()
  const create = useCreateList()
  const clone = useCloneLatestArchivedList()

  const createList = async () => {
    try {
      const list = await create.mutateAsync()
      navigate(`/list/${list.id}`)
    } catch {}
  }

  const cloneList = async () => {
    try {
      const list = await clone.mutateAsync()
      if (list) navigate(`/list/${list.id}`)
    } catch {}
  }

  if (active.isLoading) return <main className="mx-auto min-h-[100dvh] max-w-xl p-5"><LoadSkeleton /></main>

  const error = active.error ?? archived.error ?? create.error ?? clone.error
  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl bg-zinc-50 p-5 text-zinc-950">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div><p className="text-sm font-medium text-emerald-700">Tipiti</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Listas ativas</h1></div>
        {active.data?.length ? <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white active:scale-[0.98] disabled:opacity-60" disabled={create.isPending} type="button" onClick={() => void createList()}>Criar lista</button> : null}
      </header>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error.message}</p><button className="mt-2 font-medium underline" type="button" onClick={() => void (create.error ? createList() : clone.error ? cloneList() : active.refetch())}>Tentar novamente</button></div>}
      {!active.data?.length ? <section className="mt-14 text-center"><h2 className="text-xl font-medium">Sua próxima compra começa aqui.</h2><p className="mt-2 text-sm text-zinc-600">Crie uma lista para adicionar seus itens.</p><button className="mt-5 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium active:scale-[0.98]" disabled={create.isPending} type="button" onClick={() => void createList()}>Criar lista</button></section> : <section className="mt-4">{active.data.map((list) => <ListSummary key={list.id} list={list} />)}</section>}
      {archived.data?.length ? <button className="mt-6 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium active:scale-[0.98] disabled:opacity-60" disabled={clone.isPending} type="button" onClick={() => void cloneList()}>Copiar última compra</button> : null}
    </main>
  )
}
