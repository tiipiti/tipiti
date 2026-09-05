import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from './forms'
import { PixelCoin } from './PixelIcons'
import { useMonthlyHistory } from './queries'

const chartConfig = {
  total: {
    label: 'Total Gasto',
    color: '#FFFF00',
  },
} satisfies ChartConfig

export function DashboardPage() {
  const [monthsRange, setMonthsRange] = useState<6 | 12>(6)
  const historyQuery = useMonthlyHistory(monthsRange)

  const history = historyQuery.data?.history ?? []
  const stats = historyQuery.data?.stats
  const maxTotal = stats?.maxMonth?.total || 1

  return (
    <main className="tipiti-page">
      <header className="flex items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-black">Tipiti</p>
            <span className="bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F4F0EB]">
              Dashboard
            </span>
          </div>
          <h1 className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
            Consumo por mês
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/home" className="tipiti-button py-2 text-xs">
            ← Início
          </Link>
        </div>
      </header>

      {/* Range filter buttons */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-black">
          Período exibido
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className={`tipiti-button py-1 px-3 text-xs ${
              monthsRange === 6 ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => setMonthsRange(6)}
          >
            6 meses
          </button>
          <button
            type="button"
            className={`tipiti-button py-1 px-3 text-xs ${
              monthsRange === 12 ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => setMonthsRange(12)}
          >
            12 meses
          </button>
        </div>
      </div>

      {historyQuery.isLoading && (
        <div className="mt-6 grid gap-4">
          <div className="tipiti-skeleton h-24" />
          <div className="tipiti-skeleton h-64" />
          <div className="tipiti-skeleton h-32" />
        </div>
      )}

      {historyQuery.error && (
        <div className="tipiti-panel tipiti-panel-orange mt-6 text-sm text-black">
          <p className="font-bold">{historyQuery.error.message}</p>
          <button
            className="mt-2 font-bold underline cursor-pointer"
            type="button"
            onClick={() => historyQuery.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!historyQuery.isLoading && !historyQuery.error && (
        <>
          {/* Summary KPI Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="tipiti-panel tipiti-panel-yellow tipiti-panel-action p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                Total acumulado
              </span>
              <p className="mt-1 font-['Impact','Arial_Black',sans-serif] text-xl font-black uppercase text-black">
                {formatCurrency(stats?.totalSpent ?? 0)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-black/70">
                {stats?.totalPurchases ?? 0} {(stats?.totalPurchases ?? 0) === 1 ? 'compra' : 'compras'}
              </p>
            </div>

            <div className="tipiti-panel tipiti-panel-green tipiti-panel-action p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                Média mensal
              </span>
              <p className="mt-1 font-['Impact','Arial_Black',sans-serif] text-xl font-black uppercase text-black">
                {formatCurrency(stats?.averagePerMonth ?? 0)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-black/70">
                Nos últimos {monthsRange} meses
              </p>
            </div>
          </div>

          {/* Shadcn Chart Panel */}
          <section className="tipiti-panel tipiti-panel-action mt-6" aria-label="Gráfico de consumo">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                  Histórico de Gastos (R$)
                </h2>
                <p className="text-[10px] font-bold uppercase text-black/70">
                  Valores finalizados por mês
                </p>
              </div>
              <PixelCoin width={28} height={28} />
            </div>

            <div className="mt-4">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={history} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000025" />
                  <XAxis
                    dataKey="shortLabel"
                    tickLine={false}
                    tickMargin={8}
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    tick={{ fill: '#000000', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#000000', strokeWidth: 2 }}
                    tick={{ fill: '#000000', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val: number) => `R$${val}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="bg-[#F4F0EB] border-2 border-black rounded-none shadow-[4px_4px_0_#000] text-black"
                        formatter={(value) => (
                          <span className="font-mono font-bold text-xs">
                            {formatCurrency(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[0, 0, 0, 0]}
                    stroke="#000000"
                    strokeWidth={2}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </section>

          {/* Month-by-month Breakdown */}
          <section className="mt-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-black">
                Detalhamento dos Meses
              </h2>
              <span className="text-[10px] font-bold uppercase text-black/70">
                {monthsRange} meses
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {[...history].reverse().map((month) => {
                const percentage = maxTotal > 0 ? Math.round((month.total / maxTotal) * 100) : 0
                return (
                  <div
                    key={month.monthKey}
                    className="tipiti-panel tipiti-panel-action p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-black">
                          {month.fullLabel}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-black/70 mt-0.5">
                          {month.purchases} {month.purchases === 1 ? 'compra finalizada' : 'compras finalizadas'} • {month.itemsCount} {month.itemsCount === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <p className="font-['Impact','Arial_Black',sans-serif] text-lg font-black uppercase text-black">
                        {formatCurrency(month.total)}
                      </p>
                    </div>

                    {/* Progress bar visual comparison */}
                    <div className="mt-2 h-2.5 w-full border-2 border-black bg-[#D6D0C8] p-[1px]">
                      <div
                        className="h-full bg-black transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
