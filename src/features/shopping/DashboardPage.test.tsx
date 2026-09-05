/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHistoryQuery = vi.fn()

vi.mock('./queries', () => ({
  useMonthlyHistory: (monthsRange: number) => mockHistoryQuery(monthsRange),
}))

import { DashboardPage } from './DashboardPage'

afterEach(cleanup)

describe('DashboardPage', () => {
  beforeEach(() => {
    mockHistoryQuery.mockReturnValue({
      data: {
        history: [
          {
            monthKey: '2026-08',
            label: 'Ago/26',
            shortLabel: 'Ago',
            fullLabel: 'Agosto de 2026',
            year: 2026,
            monthIndex: 7,
            total: 150,
            purchases: 2,
            itemsCount: 5,
          },
          {
            monthKey: '2026-09',
            label: 'Set/26',
            shortLabel: 'Set',
            fullLabel: 'Setembro de 2026',
            year: 2026,
            monthIndex: 8,
            total: 300,
            purchases: 3,
            itemsCount: 12,
          },
        ],
        stats: {
          totalSpent: 450,
          totalPurchases: 5,
          totalItems: 17,
          averagePerMonth: 225,
          maxMonth: {
            monthKey: '2026-09',
            label: 'Set/26',
            shortLabel: 'Set',
            fullLabel: 'Setembro de 2026',
            year: 2026,
            monthIndex: 8,
            total: 300,
            purchases: 3,
            itemsCount: 12,
          },
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renders dashboard title, timeline and KPIs', () => {
    render(<DashboardPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { name: 'Consumo por mês' })).toBeInTheDocument()
    expect(screen.getByText('Total acumulado')).toBeInTheDocument()
    expect(screen.getByText('Média mensal')).toBeInTheDocument()
    expect(screen.getByText(/450,00/)).toBeInTheDocument()
    expect(screen.getByText(/225,00/)).toBeInTheDocument()
    expect(screen.getByText('Linha do Tempo')).toBeInTheDocument()
    expect(screen.getByText('Comparativo de Gastos por Mês')).toBeInTheDocument()
  })

  it('renders timeline with month details', () => {
    render(<DashboardPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument()
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument()
    expect(screen.getByText(/300,00/)).toBeInTheDocument()
    expect(screen.getByText(/150,00/)).toBeInTheDocument()
    expect(screen.getByText(/3 LISTAS FINALIZADAS/)).toBeInTheDocument()
    expect(screen.getByText(/12 ITENS COMPRADOS/)).toBeInTheDocument()
  })

  it('switches time range between 6 and 12 months', () => {
    render(<DashboardPage />, { wrapper: MemoryRouter })

    const button12 = screen.getByRole('button', { name: '12 Meses' })
    fireEvent.click(button12)

    expect(mockHistoryQuery).toHaveBeenCalledWith(12)
  })

  it('shows error state with retry button', () => {
    const refetch = vi.fn()
    mockHistoryQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Erro ao carregar dados' },
      refetch,
    })

    render(<DashboardPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(refetch).toHaveBeenCalled()
  })
})
