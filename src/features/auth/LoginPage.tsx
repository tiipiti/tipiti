import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { z } from 'zod'

import { emailSchema, passwordAuthSchema, signupSchema } from '@/features/shopping/forms'
import { supabase } from '@/lib/supabase'

type EmailValues = z.infer<typeof emailSchema>
type PasswordAuthValues = z.infer<typeof passwordAuthSchema>
type SignupValues = z.infer<typeof signupSchema>
type AuthMode = 'signup' | 'login' | 'magic-link'

export function LoginPage({ initialMode = 'magic-link' }: { initialMode?: AuthMode }) {
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') as AuthMode | null
  const [mode, setMode] = useState<AuthMode>(
    modeParam === 'signup' || modeParam === 'login' || modeParam === 'magic-link'
      ? modeParam
      : initialMode,
  )

  const navigate = useNavigate()
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Form for magic link (email only)
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  // Form for password login
  const loginForm = useForm<PasswordAuthValues>({
    resolver: zodResolver(passwordAuthSchema),
    defaultValues: { email: '', password: '' },
  })

  // Form for signup
  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', preferred_name: '', email: '', password: '' },
  })

  const sendMagicLink = async (email: string) => {
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

  const onMagicLinkSubmit = async ({ email }: EmailValues) => {
    if (await sendMagicLink(email)) setSentEmail(email)
  }

  const onSignupSubmit = async (values: SignupValues) => {
    setRequestError(null)
    setSuccessMessage(null)
    setRequesting(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: values.name,
            name: values.name,
            preferred_name: values.preferred_name?.trim() ? values.preferred_name.trim() : undefined,
          },
        },
      })
      if (error) {
        setRequestError(
          error.message.toLowerCase().includes('user already registered')
            ? 'Este e-mail já está cadastrado. Acesse a aba "Acessar" para entrar.'
            : error.message,
        )
        return
      }
      // Supabase returns an empty identities array when email is already registered (enumeration protection)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setRequestError('Este e-mail já está cadastrado. Acesse a aba "Acessar" para entrar.')
        return
      }
      if (data.session) {
        navigate('/home')
        return
      }
      setSuccessMessage(
        'Conta criada! Como a confirmação está ativa no Supabase, confirme o link no seu e-mail para entrar (ou desative "Confirm email" no painel do Supabase para login direto sem confirmação).',
      )
      setMode('login')
      loginForm.setValue('email', values.email)
      loginForm.setValue('password', '')
    } catch {
      setRequestError('Não foi possível criar a conta. Tente novamente.')
    } finally {
      setRequesting(false)
    }
  }

  const onPasswordLoginSubmit = async ({ email, password }: PasswordAuthValues) => {
    setRequestError(null)
    setRequesting(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login credentials')) {
          setRequestError('E-mail ou senha incorretos.')
        } else if (msg.includes('email not confirmed')) {
          setRequestError('E-mail ainda não confirmado. Verifique seu e-mail ou desative "Confirm email" nas configurações do Supabase.')
        } else {
          setRequestError(error.message)
        }
        return
      }
      if (data.session) {
        navigate('/home')
      }
    } catch {
      setRequestError('Não foi possível entrar. Verifique seus dados.')
    } finally {
      setRequesting(false)
    }
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setRequestError(null)
    setSuccessMessage(null)
    setSentEmail(null)
  }

  return (
    <main className="tipiti-page flex min-h-[100dvh] flex-col justify-center">
      <section className="tipiti-panel tipiti-panel-action">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <p className="tipiti-pixel text-base font-bold uppercase tracking-wider text-black">Tipiti</p>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-[#F4F0EB] px-2 py-0.5">
            Acesso
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            className={`tipiti-button py-2 text-[11px] ${
              mode === 'signup' ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => switchMode('signup')}
          >
            Cadastrar
          </button>
          <button
            type="button"
            className={`tipiti-button py-2 text-[11px] ${
              mode === 'login' ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => switchMode('login')}
          >
            Acessar
          </button>
          <button
            type="button"
            className={`tipiti-button py-2 text-[11px] ${
              mode === 'magic-link' ? 'tipiti-button-primary' : 'tipiti-button-secondary'
            }`}
            onClick={() => switchMode('magic-link')}
          >
            Só E-mail
          </button>
        </div>

        {/* Mode Headings */}
        <div className="mt-5">
          {mode === 'signup' && (
            <div>
              <h1 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
                Criar conta
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black">
                Cadastro rápido sem confirmação de e-mail.
              </p>
            </div>
          )}

          {mode === 'login' && (
            <div>
              <h1 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
                Entrar
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black">
                Acesse com seu e-mail e senha.
              </p>
            </div>
          )}

          {mode === 'magic-link' && (
            <div>
              <h1 className="font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
                Sua lista, sem papel.
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black">
                Entre com seu e-mail (sem senha).
              </p>
            </div>
          )}
        </div>

        {successMessage && (
          <div className="tipiti-panel tipiti-panel-green mt-4 text-xs font-bold uppercase text-black">
            <p>{successMessage}</p>
          </div>
        )}

        {/* CADASTRO COM SENHA */}
        {mode === 'signup' && (
          <form
            className="mt-5 grid gap-3"
            onSubmit={signupForm.handleSubmit(onSignupSubmit)}
            noValidate
          >
            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="signup-name">
                Seu nome
              </label>
              <input
                id="signup-name"
                type="text"
                maxLength={100}
                placeholder="Ex.: Maria Silva"
                autoComplete="name"
                className="tipiti-input"
                aria-invalid={Boolean(signupForm.formState.errors.name)}
                {...signupForm.register('name')}
              />
              {signupForm.formState.errors.name && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {signupForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-black"
                htmlFor="signup-preferred-name"
              >
                Como prefere ser chamado? (opcional)
              </label>
              <input
                id="signup-preferred-name"
                type="text"
                maxLength={50}
                placeholder="Ex.: Maria"
                className="tipiti-input"
                aria-invalid={Boolean(signupForm.formState.errors.preferred_name)}
                {...signupForm.register('preferred_name')}
              />
              {signupForm.formState.errors.preferred_name && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {signupForm.formState.errors.preferred_name.message}
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="signup-email">
                Seu e-mail
              </label>
              <input
                id="signup-email"
                type="email"
                maxLength={254}
                placeholder="Ex.: maria@email.com"
                autoComplete="email"
                className="tipiti-input"
                aria-invalid={Boolean(signupForm.formState.errors.email)}
                {...signupForm.register('email')}
              />
              {signupForm.formState.errors.email && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {signupForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="signup-password">
                Senha
              </label>
              <div className="relative flex items-center">
                <input
                  id="signup-password"
                  type={showSignupPassword ? 'text' : 'password'}
                  maxLength={72}
                  autoComplete="new-password"
                  className="tipiti-input pr-28"
                  aria-invalid={Boolean(signupForm.formState.errors.password)}
                  {...signupForm.register('password')}
                />
                <button
                  type="button"
                  className="tipiti-button tipiti-button-sm absolute right-1.5 py-1 px-2.5 text-[10px]"
                  onClick={() => setShowSignupPassword((prev) => !prev)}
                  aria-label={showSignupPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSignupPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <p className="text-[10px] font-bold uppercase text-black/70">
                Mínimo de 8 caracteres com letras e números
              </p>
              {signupForm.formState.errors.password && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {signupForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {requestError && (
              <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                {requestError}
              </p>
            )}

            <button
              className="tipiti-button tipiti-button-primary w-full mt-2"
              disabled={requesting}
              type="submit"
            >
              {requesting ? 'Criando conta...' : 'Criar conta'}
            </button>

            <div className="mt-3 flex flex-col gap-2 border-t-2 border-black pt-3 text-center text-xs font-bold uppercase">
              <button
                type="button"
                className="underline cursor-pointer text-black"
                onClick={() => switchMode('login')}
              >
                Já tem conta? Entrar com senha
              </button>
              <button
                type="button"
                className="underline cursor-pointer text-black"
                onClick={() => switchMode('magic-link')}
              >
                Prefere sem senha? Entrar via e-mail
              </button>
            </div>
          </form>
        )}

        {/* LOGIN COM SENHA */}
        {mode === 'login' && (
          <form
            className="mt-5 grid gap-4"
            onSubmit={loginForm.handleSubmit(onPasswordLoginSubmit)}
            noValidate
          >
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="login-email">
                Seu e-mail
              </label>
              <input
                id="login-email"
                type="email"
                maxLength={254}
                autoComplete="email"
                className="tipiti-input"
                aria-invalid={Boolean(loginForm.formState.errors.email)}
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="login-password">
                Senha
              </label>
              <div className="relative flex items-center">
                <input
                  id="login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  maxLength={72}
                  autoComplete="current-password"
                  className="tipiti-input pr-28"
                  aria-invalid={Boolean(loginForm.formState.errors.password)}
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  className="tipiti-button tipiti-button-sm absolute right-1.5 py-1 px-2.5 text-[10px]"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  aria-label={showLoginPassword ? 'Ocultar senha de acesso' : 'Mostrar senha de acesso'}
                >
                  {showLoginPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            {requestError && (
              <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                {requestError}
              </p>
            )}

            <button
              className="tipiti-button tipiti-button-primary w-full mt-2"
              disabled={requesting}
              type="submit"
            >
              {requesting ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="mt-3 flex flex-col gap-2 border-t-2 border-black pt-3 text-center text-xs font-bold uppercase">
              <button
                type="button"
                className="underline cursor-pointer text-black"
                onClick={() => switchMode('signup')}
              >
                Não tem conta? Cadastre-se
              </button>
              <button
                type="button"
                className="underline cursor-pointer text-black"
                onClick={() => switchMode('magic-link')}
              >
                Entrar com link no e-mail (sem senha)
              </button>
            </div>
          </form>
        )}

        {/* SÓ E-MAIL (MAGIC LINK) */}
        {mode === 'magic-link' && (
          <div>
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
                  onClick={() => void sendMagicLink(sentEmail)}
                >
                  {requesting ? 'Enviando...' : 'Reenviar link'}
                </button>
                <button
                  className="tipiti-button w-full"
                  disabled={requesting}
                  type="button"
                  onClick={() => {
                    emailForm.reset({ email: sentEmail })
                    setSentEmail(null)
                  }}
                >
                  Corrigir e-mail
                </button>
              </div>
            ) : (
              <form
                className="mt-5 grid gap-4"
                onSubmit={emailForm.handleSubmit(onMagicLinkSubmit)}
                noValidate
              >
                <div className="grid gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-black" htmlFor="email">
                    Seu e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    className="tipiti-input"
                    aria-invalid={Boolean(emailForm.formState.errors.email)}
                    {...emailForm.register('email')}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                      {emailForm.formState.errors.email.message}
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

                <div className="mt-3 flex flex-col gap-2 border-t-2 border-black pt-3 text-center text-xs font-bold uppercase">
                  <button
                    type="button"
                    className="underline cursor-pointer text-black"
                    onClick={() => switchMode('signup')}
                  >
                    Criar conta com senha
                  </button>
                  <button
                    type="button"
                    className="underline cursor-pointer text-black"
                    onClick={() => switchMode('login')}
                  >
                    Já possui senha? Entrar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
