import { Link } from 'react-router-dom'

import { ListSummary } from './ListSummary'
import { useArchivedLists } from './queries'
import { AppFooter } from '@/components/AppFooter'
import { ErrorPanel } from '@/components/ErrorPanel'
import { PageHeader } from '@/components/PageHeader'

export function HistoryPage() {
  const history = useArchivedLists()

  return (
    <main className="tipiti-page">
      <PageHeader
        title="Histórico"
        actions={
          <>
            <Link className="tipiti-button py-2 text-xs" to="/dashboard">Dashboard</Link>
            <Link className="tipiti-button py-2 text-xs" to="/home">Listas ativas</Link>
            <Link className="tipiti-button py-2 text-xs" to="/profile">Perfil</Link>
          </>
        }
      />

      {history.isLoading && (
        <div className="mt-8 grid gap-4">
          <div className="tipiti-skeleton h-20" />
          <div className="tipiti-skeleton h-20" />
        </div>
      )}

      {history.error && (
        <ErrorPanel
          className="mt-6"
          message={history.error.message}
          onRetry={() => void history.refetch()}
        />
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

      <AppFooter />
    </main>
  )
}
