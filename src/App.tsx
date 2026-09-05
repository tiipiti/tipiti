import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

import { CallbackPage } from '@/features/auth/CallbackPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { SessionGate } from '@/features/auth/gate'
import { useSession } from '@/features/auth/session'
import { HistoryPage } from '@/features/shopping/HistoryPage'
import { HomePage } from '@/features/shopping/HomePage'
import { ListPage } from '@/features/shopping/ListPage'
import { DashboardPage } from '@/features/shopping/DashboardPage'
import { ProfilePage } from '@/features/auth/ProfilePage'

function PrivatePage({ children }: { children: ReactNode }) {
  const { loading, session } = useSession()
  return <SessionGate loading={loading} session={session}>{children}</SessionGate>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage initialMode="signup" />} />
      <Route path="/cadastro" element={<LoginPage initialMode="signup" />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="/home" element={<PrivatePage><HomePage /></PrivatePage>} />
      <Route path="/history" element={<PrivatePage><HistoryPage /></PrivatePage>} />
      <Route path="/dashboard" element={<PrivatePage><DashboardPage /></PrivatePage>} />
      <Route path="/list/:id" element={<PrivatePage><ListPage /></PrivatePage>} />
      <Route path="/profile" element={<PrivatePage><ProfilePage /></PrivatePage>} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}

export default App
