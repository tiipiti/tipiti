import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

type SessionState = { loading: boolean; session: Session | null }

const SessionContext = createContext<SessionState>({ loading: true, session: null })

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ loading: true, session: null })

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ loading: false, session: data.session })
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ loading: false, session })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  return <SessionContext value={state}>{children}</SessionContext>
}

export const useSession = () => useContext(SessionContext)
