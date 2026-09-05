/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    auth.signInWithOtp.mockReset()
    auth.signUp.mockReset()
    auth.signInWithPassword.mockReset()
  })

  afterEach(cleanup)

  it('sends a sign-in link and confirms submitted email', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))

    await waitFor(() => expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ana@example.com',
      options: expect.objectContaining({
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      }),
    })))
    expect(screen.getByText('Confira ana@example.com')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Entrar para teste' })).toBeNull()
  })

  it('explains email rate limit without exposing Supabase text', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } })
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Aguarde alguns minutos antes de pedir outro link.')
  })

  it('does not expose generic Supabase errors', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { message: 'Unexpected Supabase failure' } })
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível enviar o link. Tente novamente.')
  })

  it('allows correction and resends the last valid email', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    await screen.findByText('Confira ana@example.com')

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar link' }))
    await waitFor(() => expect(auth.signInWithOtp).toHaveBeenCalledTimes(2))
    expect(auth.signInWithOtp).toHaveBeenLastCalledWith(expect.objectContaining({ email: 'ana@example.com' }))

    fireEvent.click(screen.getByRole('button', { name: 'Corrigir e-mail' }))
    expect((screen.getByLabelText('Seu e-mail') as HTMLInputElement).value).toBe('ana@example.com')
  })

  it('creates an account with email and password', async () => {
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: 'fake-token' }, user: { id: 'u1' } },
      error: null,
    })
    render(<LoginPage initialMode="signup" />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
          password: 'senha123',
        }),
      ),
    )
  })

  it('logs in with email and password', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'fake-token' }, user: { id: 'u1' } },
      error: null,
    })
    render(<LoginPage initialMode="login" />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(auth.signInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
          password: 'senha123',
        }),
      ),
    )
  })
})
