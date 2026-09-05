import { Link } from 'react-router-dom'

import { DashboardSection } from './DashboardSection'

export function DashboardPage() {
  return (
    <main className="tipiti-page pb-12">
      <header className="flex items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">Tipiti</p>
            <span className="bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F4F0EB]">
              Dashboard
            </span>
          </div>
          <h1 className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
            Consumo por mês
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="tipiti-button py-2 text-xs">
            Perfil
          </Link>
          <Link to="/home" className="tipiti-button py-2 text-xs">
            ← Início
          </Link>
        </div>
      </header>

      <DashboardSection />
    </main>
  )
}
