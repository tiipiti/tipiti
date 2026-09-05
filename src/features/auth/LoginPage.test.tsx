/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
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

  it('creates an account with name, preferred name, email and password', async () => {
    auth.signUp.mockResolvedValue({
      data: { session: { access_token: 'fake-token' }, user: { id: 'u1' } },
      error: null,
    })
    render(<LoginPage initialMode="signup" />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana Silva' } })
    fireEvent.change(screen.getByLabelText(/como prefere ser chamado/i), { target: { value: 'Aninha' } })
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ana@example.com',
          password: 'senha123',
          options: expect.objectContaining({
            data: expect.objectContaining({
              full_name: 'Ana Silva',
              preferred_name: 'Aninha',
            }),
          }),
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

  it('toggles password visibility', () => {
    render(<LoginPage initialMode="signup" />, { wrapper: MemoryRouter })
    const passwordInput = screen.getByLabelText('Senha')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleButton = screen.getByRole('button', { name: 'Mostrar senha' })
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('validates strong password with length, letter and number during signup', async () => {
    render(<LoginPage initialMode="signup" />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana Silva' } })
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('A senha deve ter no mínimo 8 caracteres')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'onlyletters' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('A senha deve conter pelo menos um número')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('A senha deve conter pelo menos uma letra')).toBeInTheDocument()
  })
})
