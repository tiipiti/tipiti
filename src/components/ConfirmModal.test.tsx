/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmModal, ConfirmProvider, useConfirm } from './ConfirmModal'

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

describe('ConfirmProvider & useConfirm', () => {
  it('throws error when used outside ConfirmProvider', () => {
    function InvalidConsumer() {
      useConfirm()
      return null
    }

    expect(() => render(<InvalidConsumer />)).toThrow(
      'useConfirm must be used within a ConfirmProvider',
    )
  })

  it('opens modal and resolves promise when confirmed', async () => {
    let result: boolean | null = null

    function TestConsumer() {
      const confirm = useConfirm()
      return (
        <button
          type="button"
          onClick={async () => {
            result = await confirm({
              title: 'Excluir Item',
              message: 'Tem certeza?',
              confirmText: 'Sim, deletar',
            })
          }}
        >
          Disparar
        </button>
      )
    }

    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Excluir Item')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, deletar' }))
    await waitFor(() => expect(result).toBe(true))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('resolves promise with false when cancelled', async () => {
    let result: boolean | null = null

    function TestConsumer() {
      const confirm = useConfirm()
      return (
        <button
          type="button"
          onClick={async () => {
            result = await confirm({
              title: 'Excluir Item',
              message: 'Tem certeza?',
            })
          }}
        >
          Disparar
        </button>
      )
    }

    render(
      <ConfirmProvider>
        <TestConsumer />
      </ConfirmProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disparar' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(result).toBe(false))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
