/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./queries', () => ({
  useActiveLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useArchivedLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useCreateList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useCloneLatestArchivedList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useRenameList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useItems: () => ({ data: [], isLoading: false }),
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
})
