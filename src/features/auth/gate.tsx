import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate } from 'react-router-dom'

type SessionGateProps = {
  children: ReactNode
  loading: boolean
  session: Session | null
}

export function SessionGate({ children, loading, session }: SessionGateProps) {
  if (loading) return <div className="mx-auto mt-12 h-32 max-w-md animate-pulse rounded-2xl bg-zinc-200" />
  return session ? children : <Navigate replace to="/login" />
}
