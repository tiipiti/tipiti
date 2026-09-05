/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ signInAnonymously: vi.fn().mockResolvedValue({ error: null }) }))

vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('creates an anonymous Supabase session for temporary testing', async () => {
    render(<LoginPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar para teste' }))

    await waitFor(() => expect(auth.signInAnonymously).toHaveBeenCalledTimes(1))
  })
})
