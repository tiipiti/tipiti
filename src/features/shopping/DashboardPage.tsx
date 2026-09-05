import { useState } from 'react'
import { Link } from 'react-router-dom'

import { DashboardSection } from './DashboardSection'
import { AppFooter } from '@/components/AppFooter'
import { PageHeader } from '@/components/PageHeader'

export function DashboardPage() {
  const [monthsRange, setMonthsRange] = useState<6 | 12>(6)

  return (
    <main className="tipiti-page pb-12">
      <PageHeader
        title="Consumo por mês"
        badge="Dashboard"
        actions={
          <>
            <Link to="/history" className="tipiti-button py-2 text-xs">Histórico</Link>
            <Link to="/home" className="tipiti-button py-2 text-xs">← Início</Link>
          </>
        }
      >
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className={`tipiti-button py-1.5 px-3 text-xs ${
              monthsRange === 6 ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => setMonthsRange(6)}
          >
            6 Meses
          </button>
          <button
            type="button"
            className={`tipiti-button py-1.5 px-3 text-xs ${
              monthsRange === 12 ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => setMonthsRange(12)}
          >
            12 Meses
          </button>
        </div>
      </PageHeader>

      <DashboardSection monthsRange={monthsRange} />
      <AppFooter />
    </main>
  )
}
