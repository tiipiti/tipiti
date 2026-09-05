/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const archiveMutate = vi.fn()
const uncheckAllMutate = vi.fn()
const updateItemMutate = vi.fn()
const deleteItemMutate = vi.fn()

vi.mock('./queries', () => ({
  useList: () => ({ data: { id: 'list-1', name: 'Mercado', is_archived: false }, error: null, isLoading: false, refetch: vi.fn() }),
  useItems: () => ({ data: [
    { id: 'rice', list_id: 'list-1', name: 'Arroz', quantity: 2, price: 12.5, is_purchased: true },
    { id: 'beans', list_id: 'list-1', name: 'Feijão', quantity: 1, price: 9, is_purchased: false },
  ], error: null, isLoading: false, refetch: vi.fn() }),
  useCreateItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useUpdateItem: () => ({ mutateAsync: updateItemMutate, error: null, isPending: false, reset: vi.fn() }),
  useToggleItem: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useDeleteItem: () => ({ mutateAsync: deleteItemMutate, error: null, isPending: false, reset: vi.fn() }),
  useArchiveList: () => ({ mutateAsync: archiveMutate, error: null, isPending: false, reset: vi.fn() }),
  useReopenList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useUncheckAllItems: () => ({ mutateAsync: uncheckAllMutate, error: null, isPending: false, reset: vi.fn() }),
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

  it('uses a direct purchase checkbox and item table headers', () => {
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('columnheader', { name: 'ITEM' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'QTD' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'PREÇO' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'STATUS' })).toBeTruthy()

    // Unpurchased item (Feijão) has checkbox unchecked and has Editar button
    const beansCheckbox = screen.getByRole('checkbox', { name: 'Marcar Feijão como comprado' })
    expect(beansCheckbox).toHaveAttribute('aria-checked', 'false')

    // Purchased item (Arroz) has checkbox checked and does NOT have Editar button (only Excluir is active)
    const riceCheckbox = screen.getByRole('checkbox', { name: 'Marcar Arroz como não comprado' })
    expect(riceCheckbox).toHaveAttribute('aria-checked', 'true')

    // Only 1 Editar button is rendered (for Feijão), while both have Excluir
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Excluir' })).toHaveLength(2)
  })

  it('opens confirmation modal and resets purchased items when clicking Desmarcar comprados', async () => {
    uncheckAllMutate.mockReset()
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    const resetBtn = screen.getByRole('button', { name: 'Desmarcar comprados' })
    expect(resetBtn).toBeInTheDocument()

    fireEvent.click(resetBtn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Desmarcar Comprados')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, Desmarcar Todos' }))
    await waitFor(() => expect(uncheckAllMutate).toHaveBeenCalledWith('list-1'))
  })

  it('asks whether to leave items pending in a confirmation modal when finishing a list', async () => {
    archiveMutate.mockReset()
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    // Modal is initially closed
    expect(screen.queryByRole('dialog')).toBeNull()

    // Click finish button opens ConfirmModal
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar compra' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Finalizar lista com pendência?')).toBeInTheDocument()
    expect(
      screen.getByText(/Ficou 1 item pendente. Vai ficar pendente\? Deseja finalizar toda a lista\?/),
    ).toBeInTheDocument()

    // Click cancel button dismisses modal without calling archive
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para a lista' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(archiveMutate).not.toHaveBeenCalled()

    // Open again and confirm
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar compra' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sim, finalizar toda a lista' }))
    await waitFor(() => expect(archiveMutate).toHaveBeenCalledWith('list-1'))
  })

  it('allows quick quantity adjustments using stepper buttons on an item', async () => {
    updateItemMutate.mockReset()
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    const incrementBtn = screen.getByRole('button', { name: 'Aumentar quantidade de Feijão' })
    expect(incrementBtn).toBeInTheDocument()

    fireEvent.click(incrementBtn)
    await waitFor(() =>
      expect(updateItemMutate).toHaveBeenCalledWith({
        id: 'beans',
        listId: 'list-1',
        quantity: 2,
        price: 9,
      }),
    )
  })

  it('asks confirmation in ConfirmModal before deleting an item', async () => {
    deleteItemMutate.mockReset()
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' })
    fireEvent.click(deleteButtons[0])

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Excluir Item')).toBeInTheDocument()
    expect(screen.getByText(/Deseja remover "Feijão" da lista\?/)).toBeInTheDocument()

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Excluir' }))
    await waitFor(() =>
      expect(deleteItemMutate).toHaveBeenCalledWith({
        id: 'beans',
        listId: 'list-1',
      }),
    )
  })

  it('edits only the price of an item since quantity is managed by steppers', async () => {
    updateItemMutate.mockReset()
    render(
      <MemoryRouter initialEntries={['/list/list-1']}>
        <Routes><Route path="/list/:id" element={<ListPage />} /></Routes>
      </MemoryRouter>,
    )

    // Click Editar on Feijão
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    // Should only have Preço unitário field, no Quantidade input
    expect(screen.queryByLabelText('Quantidade')).toBeNull()
    const priceInput = screen.getByLabelText('Preço unitário (R$)')
    expect(priceInput).toBeInTheDocument()

    // Change price and submit
    fireEvent.change(priceInput, { target: { value: '11.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(updateItemMutate).toHaveBeenCalledWith({
        id: 'beans',
        listId: 'list-1',
        quantity: 1,
        price: 11.5,
      }),
    )
  })
})
