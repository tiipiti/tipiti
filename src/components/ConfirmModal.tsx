import { useEffect } from 'react'

export interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isPending, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) {
          onCancel()
        }
      }}
    >
      <div className="tipiti-panel tipiti-panel-action w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <p className="tipiti-pixel text-sm font-bold uppercase tracking-wider text-black">Tipiti</p>
          <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              variant === 'warning'
                ? 'bg-[#FF5F1F] text-black font-black'
                : 'bg-black text-[#F4F0EB]'
            }`}
          >
            {variant === 'warning' ? 'Atenção' : 'Confirmação'}
          </span>
        </div>

        <div className="mt-4">
          <h2
            id="confirm-modal-title"
            className="font-['Anton',Impact,'Arial_Black',sans-serif] text-2xl font-black uppercase tracking-tight text-black"
          >
            {title}
          </h2>
          <p
            id="confirm-modal-desc"
            className="mt-2 text-xs font-bold uppercase tracking-wide text-black leading-relaxed"
          >
            {message}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            className="tipiti-button tipiti-button-secondary flex-1 py-2 text-xs"
            disabled={isPending}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="tipiti-button tipiti-button-primary flex-1 py-2 text-xs"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Finalizando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
