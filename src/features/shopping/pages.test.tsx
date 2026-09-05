/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const monthlyQuery = vi.fn(() => ({
  data: { current: { total: 0, purchases: 0 }, previous: { total: 0, purchases: 0 } },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}))

vi.mock('./queries', () => ({
  useActiveLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useArchivedLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useCreateList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useCloneLatestArchivedList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useRenameList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useItems: () => ({ data: [], isLoading: false }),
  useMonthlyConsumption: () => monthlyQuery(),
}))

import { HomePage } from './HomePage'

afterEach(cleanup)

describe('HomePage', () => {
  it('offers list creation when there are no active lists', () => {
    render(<HomePage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('button', { name: 'Nova lista' })).toBeTruthy()
  })

  it('requires a list name before creating it', async () => {
    render(<HomePage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Nova lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar lista' }))

    expect(await screen.findByText('Informe um nome')).toBeTruthy()
  })

  it('shows this month, completed purchases and the difference from last month', async () => {
    monthlyQuery.mockReturnValue({
      data: { current: { total: 120, purchases: 2 }, previous: { total: 80, purchases: 1 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<HomePage />, { wrapper: MemoryRouter })
    expect(await screen.findByRole('heading', { name: 'Consumo do mês' })).toBeInTheDocument()
    expect(screen.getByText(/120,00/)).toBeInTheDocument()
    expect(screen.getByText(/40,00 a mais que agosto/)).toBeInTheDocument()
  })
})
