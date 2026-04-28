import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import VaultBackground from './components/VaultBackground'
import VaultCursor     from './components/VaultCursor'
import VaultIntro      from './components/VaultIntro'
import VaultNav        from './components/VaultNav'
import { ToastProvider } from './components/VaultToast'

import HomePage       from './pages/HomePage'
import AuditPage      from './pages/AuditPage'
import PersonaPage    from './pages/PersonaPage'
import SimulatorPage  from './pages/SimulatorPage'
import CommunityPage  from './pages/CommunityPage'
import ApprovalPage   from './pages/ApprovalPage'
import ReportPage     from './pages/ReportPage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import DashboardPage  from './pages/DashboardPage'
import ExpensesPage   from './pages/ExpensesPage'
import ProfilePage    from './pages/ProfilePage'

function ProtectedLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <>
      <VaultBackground />
      <VaultCursor />
      <VaultIntro />
      <VaultNav />
      <main style={{ marginLeft: 72, position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <Routes>
          <Route path="/"           element={<HomePage />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/expenses"   element={<ExpensesPage />} />
          <Route path="/audit"      element={<AuditPage />} />
          <Route path="/persona"    element={<PersonaPage />} />
          <Route path="/simulator"  element={<SimulatorPage />} />
          <Route path="/community"  element={<CommunityPage />} />
          <Route path="/approval"   element={<ApprovalPage />} />
          <Route path="/report"     element={<ReportPage />} />
          <Route path="/profile"    element={<ProfilePage />} />
        </Routes>
      </main>
    </>
  )
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return (
    <>
      <VaultBackground />
      {children}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/*"        element={<ProtectedLayout />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
