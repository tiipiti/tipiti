import { Navigate } from 'react-router-dom'

import { useSession } from './session'

export function CallbackPage() {
  const { loading, session } = useSession()
  if (loading) return <div className="mx-auto mt-12 h-32 max-w-md animate-pulse rounded-2xl bg-zinc-200" />
  return <Navigate replace to={session ? '/home' : '/login'} />
}
