import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

export function PasswordInput({
  id,
  registration,
  hasError,
  autoComplete = 'current-password',
  toggleAriaLabel = 'senha',
}: {
  id: string
  registration: UseFormRegisterReturn
  hasError?: boolean
  autoComplete?: string
  toggleAriaLabel?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        maxLength={72}
        autoComplete={autoComplete}
        className="tipiti-input pr-28"
        aria-invalid={Boolean(hasError)}
        {...registration}
      />
      <button
        type="button"
        className="tipiti-button tipiti-button-sm absolute right-1.5 py-1 px-2.5 text-[10px]"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? `Ocultar ${toggleAriaLabel}` : `Mostrar ${toggleAriaLabel}`}
      >
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}
