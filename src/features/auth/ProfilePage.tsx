import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import type { z } from 'zod'

import { ConfirmModal } from '@/components/ConfirmModal'
import { supabase } from '@/lib/supabase'
import { useSession } from './session'
import { getUserDisplayName } from './user'
import { updatePasswordSchema, updateProfileSchema } from '../shopping/forms'

type ProfileValues = z.infer<typeof updateProfileSchema>
type PasswordValues = z.infer<typeof updatePasswordSchema>

export function ProfilePage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const user = session?.user

  const currentDisplayName = getUserDisplayName(user)
  const initialPreferredName =
    user?.user_metadata?.preferred_name || user?.user_metadata?.name || ''

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      preferred_name: initialPreferredName,
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirm_password: '',
    },
  })

  const onUpdateProfile = async (values: ProfileValues) => {
    setProfileError(null)
    setProfileSuccess(null)
    setIsSavingProfile(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          preferred_name: values.preferred_name.trim(),
        },
      })
      if (error) {
        setProfileError(error.message)
        return
      }
      setProfileSuccess('Como você quer ser chamado foi atualizado com sucesso!')
    } catch {
      setProfileError('Erro ao atualizar nome. Tente novamente.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const onUpdatePassword = async (values: PasswordValues) => {
    setPasswordError(null)
    setPasswordSuccess(null)
    setIsSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      })
      if (error) {
        setPasswordError(error.message)
        return
      }
      setPasswordSuccess('Senha alterada com sucesso!')
      passwordForm.reset()
    } catch {
      setPasswordError('Erro ao alterar senha. Tente novamente.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const onConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch {
      setIsLoggingOut(false)
      setIsLogoutModalOpen(false)
    }
  }

  return (
    <main className="tipiti-page pb-12">
      {/* Header */}
      <header className="border-b-4 border-black pb-4">
        <div className="flex items-center justify-between">
          <Link
            className="tipiti-button tipiti-button-sm tipiti-button-secondary"
            to="/home"
          >
            &lt; VOLTAR
          </Link>
          <span className="bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F4F0EB]">
            Conta
          </span>
        </div>
        <p className="tipiti-pixel mt-3 text-sm font-bold uppercase tracking-wider text-black">
          Tipiti
        </p>
        <h1 className="mt-1 font-['Anton',Impact,'Arial_Black',sans-serif] text-3xl font-black uppercase tracking-tight text-black">
          Meu Perfil
        </h1>
        {user?.email && (
          <p className="mt-1 text-xs font-bold text-black/70">
            Conectado como: <span className="text-black">{user.email}</span>
          </p>
        )}
      </header>

      <div className="mt-6 space-y-6">
        {/* Seção 1: Como quero ser chamado */}
        <section
          aria-labelledby="heading-name"
          className="tipiti-panel tipiti-panel-action"
        >
          <div className="border-b-2 border-black pb-2">
            <h2
              id="heading-name"
              className="font-['Anton',Impact,'Arial_Black',sans-serif] text-xl font-black uppercase text-black"
            >
              Como quero ser chamado
            </h2>
            <p className="mt-1 text-xs font-bold text-black/70">
              Atual: <span className="text-black">{currentDisplayName || 'Não definido'}</span>
            </p>
          </div>

          <form
            className="mt-4 grid gap-3"
            onSubmit={profileForm.handleSubmit(onUpdateProfile)}
            noValidate
          >
            <div className="grid gap-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-black"
                htmlFor="preferred_name"
              >
                Seu apelido ou nome de exibição
              </label>
              <input
                id="preferred_name"
                className="tipiti-input text-sm"
                maxLength={50}
                placeholder="Ex: Mãe, Gui, Carol..."
                aria-invalid={Boolean(profileForm.formState.errors.preferred_name)}
                {...profileForm.register('preferred_name')}
              />
              {profileForm.formState.errors.preferred_name && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {profileForm.formState.errors.preferred_name.message}
                </p>
              )}
            </div>

            {profileSuccess && (
              <div
                className="border-2 border-black bg-[#39FF14] p-2 text-xs font-bold uppercase text-black"
                role="status"
              >
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div
                className="border-2 border-black bg-[#FF5F1F] p-2 text-xs font-bold uppercase text-black"
                role="alert"
              >
                {profileError}
              </div>
            )}

            <button
              type="submit"
              className="tipiti-button tipiti-button-primary mt-1 self-start text-xs"
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar apelido'}
            </button>
          </form>
        </section>

        {/* Seção 2: Atualizar Senha */}
        <section
          aria-labelledby="heading-password"
          className="tipiti-panel tipiti-panel-action"
        >
          <div className="border-b-2 border-black pb-2">
            <h2
              id="heading-password"
              className="font-['Anton',Impact,'Arial_Black',sans-serif] text-xl font-black uppercase text-black"
            >
              Atualizar Senha
            </h2>
            <p className="mt-1 text-xs font-bold text-black/70">
              Mínimo de 8 caracteres, com letras e números.
            </p>
          </div>

          <form
            className="mt-4 grid gap-3"
            onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
            noValidate
          >
            <div className="grid gap-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-black"
                htmlFor="new-password"
              >
                Nova senha
              </label>
              <input
                id="new-password"
                type="password"
                className="tipiti-input text-sm"
                maxLength={72}
                autoComplete="new-password"
                aria-invalid={Boolean(passwordForm.formState.errors.password)}
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="grid gap-1">
              <label
                className="text-xs font-bold uppercase tracking-wider text-black"
                htmlFor="confirm-password"
              >
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                className="tipiti-input text-sm"
                maxLength={72}
                autoComplete="new-password"
                aria-invalid={Boolean(passwordForm.formState.errors.confirm_password)}
                {...passwordForm.register('confirm_password')}
              />
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-xs font-bold text-[#FF5F1F]" role="alert">
                  {passwordForm.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            {passwordSuccess && (
              <div
                className="border-2 border-black bg-[#39FF14] p-2 text-xs font-bold uppercase text-black"
                role="status"
              >
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div
                className="border-2 border-black bg-[#FF5F1F] p-2 text-xs font-bold uppercase text-black"
                role="alert"
              >
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              className="tipiti-button tipiti-button-primary mt-1 self-start text-xs"
              disabled={isSavingPassword}
            >
              {isSavingPassword ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </section>

        {/* Seção 3: Sair da Conta (Logout) */}
        <section
          aria-labelledby="heading-session"
          className="tipiti-panel tipiti-panel-action border-[#FF5F1F]"
        >
          <div className="border-b-2 border-black pb-2">
            <h2
              id="heading-session"
              className="font-['Anton',Impact,'Arial_Black',sans-serif] text-xl font-black uppercase text-black"
            >
              Sessão Ativa
            </h2>
            <p className="mt-1 text-xs font-bold text-black/70">
              Encerrar a sessão do Tipiti neste navegador.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold uppercase text-black">
              Deseja deslogar da sua conta?
            </p>
            <button
              type="button"
              className="tipiti-button tipiti-button-warning text-xs font-black"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              Sair da conta
            </button>
          </div>
        </section>
      </div>

      {/* Modal Neo-brutalista de Confirmação de Logout */}
      <ConfirmModal
        open={isLogoutModalOpen}
        title="Sair da conta"
        message="Tem certeza que deseja encerrar sua sessão no Tipiti neste dispositivo?"
        confirmText="Sim, Sair"
        cancelText="Continuar conectado"
        variant="warning"
        isPending={isLoggingOut}
        onConfirm={() => void onConfirmLogout()}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </main>
  )
}
