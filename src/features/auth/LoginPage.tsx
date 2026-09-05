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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LoginValues>({
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
      setRequestError(error.message.toLowerCase().includes('rate limit')
        ? 'Aguarde alguns minutos antes de pedir outro link.'
        : 'Não foi possível enviar o link. Tente novamente.')
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
    <main className="grid min-h-[100dvh] place-items-center bg-zinc-50 p-5 text-zinc-950">
      <section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.3)]">
        <p className="text-sm font-medium text-emerald-700">Tipiti</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sua lista, sem papel.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Entre com seu e-mail para continuar.</p>
        {sentEmail ? (
          <div className="mt-6 grid gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>Confira {sentEmail}</p>
            {requestError && <p className="text-red-700" role="alert">{requestError}</p>}
            <button className="font-medium underline disabled:opacity-60" disabled={requesting} type="button" onClick={() => void sendLink(sentEmail)}>
              {requesting ? 'Enviando...' : 'Reenviar link'}
            </button>
            <button className="font-medium underline disabled:opacity-60" disabled={requesting} type="button" onClick={() => {
              reset({ email: sentEmail })
              setSentEmail(null)
            }}>
              Corrigir e-mail
            </button>
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="email">Seu e-mail</label>
              <input id="email" type="email" autoComplete="email" className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" aria-invalid={Boolean(errors.email)} {...register('email')} />
              {errors.email && <p className="text-sm text-red-700" role="alert">{errors.email.message}</p>}
            </div>
            {requestError && <p className="text-sm text-red-700" role="alert">{requestError}</p>}
            <button className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60" disabled={requesting} type="submit">
              {requesting ? 'Enviando...' : 'Começar'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
