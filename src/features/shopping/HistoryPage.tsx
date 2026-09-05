import { Link } from 'react-router-dom'

import { ListSummary } from './ListSummary'
import { useArchivedLists } from './queries'

export function HistoryPage() {
  const history = useArchivedLists()

  return (
    <main className="tipiti-page">
      <header className="flex items-center justify-between border-b-4 border-black pb-4">
        <div>
          <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">Tipiti</p>
          <h1 className="mt-1 font-['Impact','Arial_Black',sans-serif] text-3xl uppercase tracking-tight text-black">
            Histórico
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link className="tipiti-button py-2 text-xs" to="/dashboard">
            Dashboard
          </Link>
          <Link className="tipiti-button py-2 text-xs" to="/home">
            Listas ativas
          </Link>
        </div>
      </header>

      {history.isLoading && (
        <div className="mt-8 grid gap-4">
          <div className="tipiti-skeleton h-20" />
          <div className="tipiti-skeleton h-20" />
        </div>
      )}

      {history.error && (
        <div className="tipiti-panel tipiti-panel-orange mt-6 text-sm text-black">
          <p className="font-bold">{history.error.message}</p>
          <button
            className="mt-2 font-bold underline"
            type="button"
            onClick={() => history.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!history.isLoading && !history.error && !history.data?.length && (
        <div className="tipiti-panel mt-8 text-center font-bold uppercase text-black">
          <p>Nenhuma compra finalizada</p>
        </div>
      )}

      {history.data?.length ? (
        <section className="mt-6 grid gap-4">
          {history.data.map((list) => (
            <ListSummary key={list.id} list={list} history />
          ))}
        </section>
      ) : null}
    </main>
  )
}
