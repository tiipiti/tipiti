/* @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { SessionGate } from './gate'

describe('SessionGate', () => {
  it('shows private content after a session is restored', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <SessionGate loading={false} session={{} as never}>
                <p>Privado</p>
              </SessionGate>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Privado')).toBeTruthy()
  })

  it('redirects a missing session to login', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <SessionGate loading={false} session={null}>
                <p>Privado</p>
              </SessionGate>
            }
          />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login')).toBeTruthy()
  })
})
