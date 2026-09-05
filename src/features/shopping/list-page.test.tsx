/* @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./queries', () => ({
  useList: () => ({ data: { id: 'list-1', name: 'Mercado', is_archived: false }, error: null, isLoading: false, refetch: vi.fn() }),
  useItems: () => ({ data: [
    { id: 'rice', list_id: 'list-1', name: 'Arroz', quantity: 2, price: 12.5, is_purchased: true },
    { id: 'beans', list_id: 'list-1', name: 'Feijão', quantity: 1, price: 9, is_purchased: false },
  ], error: null, isLoading: false, refetch: vi.fn() }),
  useCreateItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useUpdateItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useToggleItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useDeleteItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useArchiveList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useReopenList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
}))

import { ListPage } from './ListPage'

describe('ListPage', () => {
  it('puts pending items first and totals only purchased items', () => {
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByTestId('item-row').map((node) => node.querySelector('span')?.textContent)).toEqual(['Feijão', 'Arroz'])
    expect(screen.getByText(/25,00/)).toBeTruthy()
  })
})
