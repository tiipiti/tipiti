import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { emailSchema } from '@/features/shopping/forms'
import { supabase } from '@/lib/supabase'

type LoginValues = { email: string }

export function LoginPage() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [anonymousPending, setAnonymousPending] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(emailSchema),
  })

  const onSubmit = async ({ email }: LoginValues) => {
    setRequestError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) return setRequestError(error.message)
    setSent(true)
  }

  const enterForTesting = async () => {
    setRequestError(null)
    setAnonymousPending(true)
    const { error } = await supabase.auth.signInAnonymously()
    setAnonymousPending(false)
    if (error) return setRequestError(error.message)
    navigate('/home')
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-zinc-50 p-5 text-zinc-950">
      <section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.3)]">
        <p className="text-sm font-medium text-emerald-700">Tipiti</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sua lista, sem papel.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Entre com seu e-mail para continuar.</p>
        {sent ? <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Confira seu e-mail.</p> : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" aria-invalid={Boolean(errors.email)} {...register('email')} />
              <p className="min-h-5 text-sm text-red-700" role="alert">{errors.email?.message}</p>
            </div>
            {requestError && <p className="text-sm text-red-700" role="alert">{requestError}</p>}
            <button className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Enviando...' : 'Enviar Magic Link'}
            </button>
            <button className="rounded-xl border border-zinc-300 px-4 py-3 font-medium active:scale-[0.98] disabled:opacity-60" disabled={anonymousPending} type="button" onClick={() => void enterForTesting()}>
              {anonymousPending ? 'Entrando...' : 'Entrar para teste'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
