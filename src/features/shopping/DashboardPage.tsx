import { useState } from 'react'
import { Link } from 'react-router-dom'

import { DashboardSection } from './DashboardSection'

export function DashboardPage() {
  const [monthsRange, setMonthsRange] = useState<6 | 12>(6)

  return (
    <main className="tipiti-page pb-12">
      <header className="border-b-4 border-black pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">Tipiti</p>
            <span className="bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-[#F4F0EB]">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/history" className="tipiti-button py-2 text-xs">
              Histórico
            </Link>
            <Link to="/home" className="tipiti-button py-2 text-xs">
              ← Início
            </Link>
          </div>
        </div>

        <h1 className="mt-2 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
          Consumo por mês
        </h1>

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
      </header>

      <DashboardSection monthsRange={monthsRange} />
    </main>
  )
}
