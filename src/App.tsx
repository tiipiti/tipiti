import { Navigate, Route, Routes } from 'react-router-dom'

import { CallbackPage } from '@/features/auth/CallbackPage'
import { LoginPage } from '@/features/auth/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  )
}

export default App
