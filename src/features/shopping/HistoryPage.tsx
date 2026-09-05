import { Link } from 'react-router-dom'

import { ListSummary } from './ListSummary'
import { useArchivedLists } from './queries'

export function HistoryPage() {
  const history = useArchivedLists()

  return (
    <main className="mx-auto min-h-[100dvh] max-w-xl bg-zinc-50 p-5 text-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-5"><div><p className="text-sm font-medium text-emerald-700">Tipiti</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Histórico</h1></div><Link className="rounded-xl border border-zinc-300 px-3 py-2 text-sm active:scale-[0.98]" to="/home">Listas ativas</Link></header>
      {history.isLoading && <div className="mt-8 grid gap-3"><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /><div className="h-20 animate-pulse rounded-2xl bg-zinc-200" /></div>}
      {history.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{history.error.message}</p><button className="mt-2 font-medium underline" type="button" onClick={() => history.refetch()}>Tentar novamente</button></div>}
      {!history.isLoading && !history.error && !history.data?.length && <p className="mt-14 text-center text-zinc-600">Nenhuma compra finalizada</p>}
      {history.data?.length ? <section className="mt-4">{history.data.map((list) => <ListSummary key={list.id} list={list} history />)}</section> : null}
    </main>
  )
}
