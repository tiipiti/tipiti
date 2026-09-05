import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate } from 'react-router-dom'

type SessionGateProps = {
  children: ReactNode
  loading: boolean
  session: Session | null
}

export function AuthLoading() {
  return (
    <main aria-busy="true" aria-label="Carregando" className="grid min-h-[100dvh] place-items-center bg-zinc-50 p-5 text-zinc-950">
      <section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.3)]">
        <p className="text-sm font-medium text-emerald-700">Tipiti</p>
        <p className="mt-3 text-sm text-zinc-600" role="status">Preparando sua lista...</p>
      </section>
    </main>
  )
}

export function SessionGate({ children, loading, session }: SessionGateProps) {
  if (loading) return <AuthLoading />
  return session ? children : <Navigate replace to="/login" />
}
