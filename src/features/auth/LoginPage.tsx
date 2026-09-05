import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { emailSchema } from '@/features/shopping/forms'
import { supabase } from '@/lib/supabase'

type LoginValues = { email: string }

export function LoginPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(emailSchema),
  })

  const sendLink = async (email: string) => {
    setRequestError(null)
    setRequesting(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      })
      if (!error) return true
      setRequestError(
        error.message.toLowerCase().includes('rate limit')
          ? 'Aguarde alguns minutos antes de pedir outro link.'
          : 'Não foi possível enviar o link. Tente novamente.',
      )
    } catch {
      setRequestError('Não foi possível enviar o link. Tente novamente.')
    } finally {
      setRequesting(false)
    }
    return false
  }

  const onSubmit = async ({ email }: LoginValues) => {
    if (await sendLink(email)) setSentEmail(email)
  }

  return (
    <main className="tipiti-page flex min-h-[100dvh] flex-col justify-center">
      <section className="tipiti-panel tipiti-panel-action">
        <p className="text-xs font-bold uppercase tracking-wider text-black">Tipiti</p>
        <h1 className="mt-2 font-['Impact','Arial_Black',sans-serif] text-3xl uppercase tracking-tight text-black">
          Sua lista, sem papel.
        </h1>
        <p className="mt-2 text-sm font-bold text-black">Entre com seu e-mail para continuar.</p>

        {sentEmail ? (
          <div className="tipiti-panel tipiti-panel-green mt-6 grid gap-3">
            <p className="font-bold uppercase text-black">Confira {sentEmail}</p>
            {requestError && (
              <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                {requestError}
              </p>
            )}
            <button
              className="tipiti-button w-full"
              disabled={requesting}
              type="button"
              onClick={() => void sendLink(sentEmail)}
            >
              {requesting ? 'Enviando...' : 'Reenviar link'}
            </button>
            <button
              className="tipiti-button w-full"
              disabled={requesting}
              type="button"
              onClick={() => {
                reset({ email: sentEmail })
                setSentEmail(null)
              }}
            >
              Corrigir e-mail
            </button>
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="email">
                Seu e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="tipiti-input"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {requestError && (
              <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                {requestError}
              </p>
            )}

            <button
              className="tipiti-button tipiti-button-primary w-full"
              disabled={requesting}
              type="submit"
            >
              {requesting ? 'Enviando...' : 'Começar'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
