/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

afterEach(cleanup)

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

  it('clears and refocuses the product field after adding an item', async () => {
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )
    const input = await screen.findByLabelText('Adicionar item')

    fireEvent.change(input, { target: { value: 'Arroz' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
    expect(document.activeElement).toBe(input)
  })

  it('uses a direct purchase control and item table headers', () => {
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('columnheader', { name: 'ITEM' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'QTD' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'PREÇO' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'STATUS' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Marcar Feijão como comprado' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('PENDENTE')).toBeTruthy()
  })
})
