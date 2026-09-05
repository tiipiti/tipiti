import { Link } from 'react-router-dom'
import { formatCurrency } from './forms'
import { monthDifference } from './monthly'
import { PixelCoin } from './PixelIcons'
export type MonthlyConsumptionData = {
  current: { total: number; purchases: number }
  previous: { total: number; purchases: number }
}

export function MonthlyBanner({
  data,
  isLoading,
}: {
  data?: MonthlyConsumptionData
  isLoading: boolean
}) {
  if (isLoading) {
    return <div className="tipiti-skeleton mt-6 h-28" />
  }

  if (!data) return null

  const now = new Date()
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(prevDate)

  const currentTotal = data.current.total ?? 0
  const currentPurchases = data.current.purchases ?? 0
  const previousTotal = data.previous.total ?? 0
  const diff = monthDifference(currentTotal, previousTotal)

  const diffText =
    diff > 0
      ? `${formatCurrency(diff)} a mais que ${prevMonthName}`
      : diff < 0
        ? `${formatCurrency(Math.abs(diff))} a menos que ${prevMonthName}`
        : 'IGUAL AO MÊS PASSADO'

  return (
    <div className="mt-6">
      <Link
        to="/dashboard"
        className="tipiti-panel tipiti-panel-yellow tipiti-panel-action block w-full text-left transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
        aria-label="Ver dashboard de consumo por mês"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="tipiti-pixel text-xs font-bold uppercase tracking-wider text-black">
                Consumo do mês
              </h2>
              <span className="bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#F4F0EB]">
                ➔ Ver dashboard completo
              </span>
            </div>
            <p className="mt-1 font-['Impact','Arial_Black',sans-serif] text-3xl font-black uppercase text-black tabular-nums">
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
      </Link>
    </div>
  )
}
