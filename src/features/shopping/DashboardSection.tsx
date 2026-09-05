import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from './forms'
import { PixelCart, PixelCoin } from './PixelIcons'
import { useMonthlyHistory } from './queries'

const chartConfig = {
  total: {
    label: 'Total Gasto',
    color: '#FFFF00',
  },
} satisfies ChartConfig

export function DashboardSection() {
  const [monthsRange, setMonthsRange] = useState<6 | 12>(6)
  const historyQuery = useMonthlyHistory(monthsRange)

  const history = historyQuery.data?.history ?? []
  const stats = historyQuery.data?.stats
  const maxTotal = stats?.maxMonth?.total || 1

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <section className="mt-6 space-y-6" aria-label="Área de Dashboard e Linha do Tempo">
      {/* Header com filtro de meses e título */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F4F0EB]">
              Dashboard
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Evolução Financeira
            </span>
          </div>
          <h2 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase tracking-tight text-black mt-1">
            Gastos e Linha do Tempo
          </h2>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {historyQuery.isLoading && (
        <div className="grid gap-4">
          <div className="tipiti-skeleton h-24" />
          <div className="tipiti-skeleton h-64" />
          <div className="tipiti-skeleton h-48" />
        </div>
      )}

      {historyQuery.error && (
        <div className="tipiti-panel tipiti-panel-orange text-sm text-black">
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
          {/* Cards KPI - Carimbo ativo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="tipiti-panel tipiti-panel-yellow tipiti-panel-action p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                  Total acumulado
                </span>
                <PixelCoin width={20} height={20} />
              </div>
              <p className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase text-black">
                {formatCurrency(stats?.totalSpent ?? 0)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-black/80">
                {stats?.totalPurchases ?? 0} {(stats?.totalPurchases ?? 0) === 1 ? 'lista feita' : 'listas feitas'}
              </p>
            </div>

            <div className="tipiti-panel tipiti-panel-green tipiti-panel-action p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-black">
                  Média mensal
                </span>
                <PixelCart width={20} height={20} />
              </div>
              <p className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase text-black">
                {formatCurrency(stats?.averagePerMonth ?? 0)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-black/80">
                Por mês ({monthsRange} meses)
              </p>
            </div>
          </div>

          {/* Gráfico Shadcn BarChart */}
          <div className="tipiti-panel tipiti-panel-action" aria-label="Gráfico de barras mensal">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Comparativo de Gastos por Mês
                </h3>
                <p className="text-[10px] font-bold uppercase text-black/70">
                  Valores finalizados em R$
                </p>
              </div>
              <span className="bg-black px-2 py-0.5 text-[10px] font-bold uppercase text-[#F4F0EB]">
                R$
              </span>
            </div>

            <div className="mt-4">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={history} margin={{ top: 15, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000030" />
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
          </div>

          {/* LINHA DO TEMPO (TIMELINE) NEO-BRUTALISTA */}
          <div className="space-y-4">
            <div className="border-b-4 border-black pb-2 flex items-center justify-between">
              <div>
                <h3 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-xl font-black uppercase tracking-tight text-black">
                  Linha do Tempo
                </h3>
                <p className="text-[11px] font-bold uppercase text-black/70">
                  Gastos e listas organizados mês a mês
                </p>
              </div>
              <span className="bg-[#FFFF00] border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[2px_2px_0_#000]">
                {history.length} MESES
              </span>
            </div>

            {/* Container da linha com eixo vertical */}
            <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-1 before:bg-black">
              {[...history].reverse().map((month) => {
                const isCurrentMonth = month.monthKey === currentMonthKey
                const isMaxMonth = stats?.maxMonth?.monthKey === month.monthKey && month.total > 0
                const percentage = maxTotal > 0 ? Math.round((month.total / maxTotal) * 100) : 0

                return (
                  <div key={month.monthKey} className="relative group">
                    {/* Nó da linha do tempo */}
                    <div
                      className={`absolute -left-[23px] top-4 h-5 w-5 border-4 border-black transition-transform group-hover:scale-110 ${
                        isCurrentMonth
                          ? 'bg-[#39FF14]'
                          : isMaxMonth
                            ? 'bg-[#FF5F1F]'
                            : month.total > 0
                              ? 'bg-[#FFFF00]'
                              : 'bg-[#D6D0C8]'
                      }`}
                    />

                    {/* Card do Mês */}
                    <div
                      className={`tipiti-panel tipiti-panel-action p-4 transition-all ${
                        isCurrentMonth ? 'border-black' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-black px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[#F4F0EB]">
                            {month.fullLabel}
                          </span>
                          {isCurrentMonth && (
                            <span className="bg-[#39FF14] border-2 border-black px-1.5 py-0.2 text-[9px] font-black uppercase text-black">
                              Mês atual
                            </span>
                          )}
                          {isMaxMonth && (
                            <span className="bg-[#FF5F1F] border-2 border-black px-1.5 py-0.2 text-[9px] font-black uppercase text-black">
                              Pico
                            </span>
                          )}
                        </div>

                        <p className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase text-black">
                          {formatCurrency(month.total)}
                        </p>
                      </div>

                      {/* Resumo de listas e itens */}
                      <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black">
                        <span>
                          {month.purchases} {month.purchases === 1 ? 'LISTA FINALIZADA' : 'LISTAS FINALIZADAS'}
                        </span>
                        <span>
                          {month.itemsCount} {month.itemsCount === 1 ? 'ITEM COMPRADO' : 'ITENS COMPRADOS'}
                        </span>
                      </div>

                      {/* Barra visual percentual */}
                      <div className="mt-2 h-3 w-full border-2 border-black bg-[#D6D0C8] p-[1px]">
                        <div
                          className="h-full bg-black transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Listas individuais daquele mês se existirem */}
                      {month.lists && month.lists.length > 0 ? (
                        <div className="mt-3 border-t-2 border-black pt-2 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase text-black/60">
                            Compras realizadas neste mês:
                          </p>
                          <div className="space-y-1">
                            {month.lists.map((list) => (
                              <div
                                key={list.id}
                                className="flex items-center justify-between text-xs font-bold uppercase text-black bg-[#E8E2DC] px-2 py-1 border border-black"
                              >
                                <span className="truncate max-w-[200px]">{list.name}</span>
                                <span className="font-mono">{formatCurrency(list.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] font-bold uppercase text-black/50 italic">
                          Nenhuma compra arquivada neste mês.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
