import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type SessionGateProps = {
  children: ReactNode
  loading: boolean
  session: Session | null
}

export function AuthLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando"
      className="grid min-h-[100dvh] place-items-center bg-[#F4F0EB] p-5 text-black"
    >
      <section className="tipiti-panel tipiti-panel-action w-full max-w-sm text-center">
        <p className="tipiti-pixel text-base font-bold uppercase tracking-wider text-black">Tipiti</p>
        <p className="mt-3 text-sm font-bold uppercase text-black" role="status">
          Preparando sua lista...
        </p>
        <div className="tipiti-skeleton mt-4 h-4 w-full" />
      </section>
    </main>
  )
}

export function SessionGate({ children, loading, session }: SessionGateProps) {
  if (loading) return <AuthLoading />
  return session ? children : <Navigate replace to="/login" />
}
