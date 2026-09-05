/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmModal } from './ConfirmModal'

afterEach(cleanup)

describe('ConfirmModal', () => {
  it('does not render anything when open is false', () => {
    const { container } = render(
      <ConfirmModal
        open={false}
        title="Teste"
        message="Mensagem"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders title, message and badges when open is true', () => {
    render(
      <ConfirmModal
        open={true}
        title="Finalizar compra?"
        message="Deseja concluir a compra?"
        variant="warning"
        confirmText="Sim, finalizar"
        cancelText="Voltar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Finalizar compra?')).toBeInTheDocument()
    expect(screen.getByText('Deseja concluir a compra?')).toBeInTheDocument()
    expect(screen.getByText('Atenção')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sim, finalizar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })

  it('triggers onConfirm when clicking confirm button', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmModal
        open={true}
        title="Confirmar"
        message="Confirmação"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('triggers onCancel when clicking cancel button', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        open={true}
        title="Confirmar"
        message="Confirmação"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('triggers onCancel when pressing Escape key', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        open={true}
        title="Confirmar"
        message="Confirmação"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when isPending is true', () => {
    render(
      <ConfirmModal
        open={true}
        title="Confirmar"
        message="Confirmação"
        isPending={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Finalizando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})
