/* @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./queries', () => ({
  useActiveLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useArchivedLists: () => ({ data: [], error: null, isLoading: false, refetch: vi.fn() }),
  useCreateList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useCloneLatestArchivedList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useRenameList: () => ({ mutateAsync: vi.fn(), error: null, isPending: false, reset: vi.fn() }),
  useItems: () => ({ data: [], isLoading: false }),
}))

import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('offers list creation when there are no active lists', () => {
    render(<HomePage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('button', { name: 'Criar lista' })).toBeTruthy()
  })
})
