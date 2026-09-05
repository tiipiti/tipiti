import { Navigate } from 'react-router-dom'

import { AuthLoading } from './gate'
import { useSession } from './session'

export function CallbackPage() {
  const { loading, session } = useSession()
  if (loading) return <AuthLoading />
  return <Navigate replace to={session ? '/home' : '/login'} />
}
