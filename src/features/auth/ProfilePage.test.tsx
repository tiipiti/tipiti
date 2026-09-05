/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  updateUser: vi.fn(),
  signOut: vi.fn(),
}))

const session = vi.hoisted(() => ({
  user: {
    id: 'user-123',
    email: 'mae@example.com',
    user_metadata: {
      preferred_name: 'Mamãe',
    },
  },
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))
vi.mock('./session', () => ({
  useSession: () => ({ session, loading: false }),
}))

import { ProfilePage } from './ProfilePage'

describe('ProfilePage', () => {
  beforeEach(() => {
    auth.updateUser.mockReset()
    auth.signOut.mockReset()
  })

  afterEach(cleanup)

  it('renders profile with user display name and sections', () => {
    render(<ProfilePage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { name: 'Meu Perfil' })).toBeInTheDocument()
    expect(screen.getByText('mae@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mamãe')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Atualizar Senha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument()
  })

  it('updates preferred name successfully', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null })
    render(<ProfilePage />, { wrapper: MemoryRouter })

    const input = screen.getByLabelText('Seu apelido ou nome de exibição')
    fireEvent.change(input, { target: { value: 'Mãe Querida' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar apelido' }))

    await waitFor(() => {
      expect(auth.updateUser).toHaveBeenCalledWith({
        data: { preferred_name: 'Mãe Querida' },
      })
    })

    expect(
      screen.getByText('Como você quer ser chamado foi atualizado com sucesso!'),
    ).toBeInTheDocument()
  })

  it('validates password mismatch when updating password', async () => {
    render(<ProfilePage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: 'NovaSenha123' },
    })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
      target: { value: 'OutraSenha123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    await waitFor(() => {
      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument()
    })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('opens confirmation modal and logs out when confirmed', async () => {
    auth.signOut.mockResolvedValue({ error: null })
    render(<ProfilePage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))

    // Modal appears
    expect(
      screen.getByText('Tem certeza que deseja encerrar sua sessão no Tipiti neste dispositivo?'),
    ).toBeInTheDocument()

    // Confirm logout in modal
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Sair' }))

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalled()
    })
  })
})
