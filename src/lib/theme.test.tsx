/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, ThemeToggle, useTheme } from './theme'

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe('Theme Context and ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(cleanup)

  it('defaults to dark mode initially', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
        <ThemeToggle />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(screen.getByRole('button', { name: 'Alternar para modo claro' })).toBeInTheDocument()
  })

  it('toggles from dark mode to light mode and back', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    const button = screen.getByTestId('theme-toggle')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Switch to light mode
    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('tipiti-theme')).toBe('light')
    expect(screen.getByRole('button', { name: 'Alternar para modo escuro' })).toBeInTheDocument()

    // Switch back to dark mode
    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('tipiti-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Alternar para modo claro' })).toBeInTheDocument()
  })

  it('respects stored light mode from localStorage', () => {
    localStorage.setItem('tipiti-theme', 'light')

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('current-theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
