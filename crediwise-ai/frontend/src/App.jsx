import { Routes, Route } from 'react-router-dom'
import VaultBackground from './components/VaultBackground'
import VaultCursor     from './components/VaultCursor'
import VaultIntro      from './components/VaultIntro'
import VaultNav        from './components/VaultNav'
import { ToastProvider } from './components/VaultToast'

import HomePage      from './pages/HomePage'
import AuditPage     from './pages/AuditPage'
import PersonaPage   from './pages/PersonaPage'
import SimulatorPage from './pages/SimulatorPage'
import CommunityPage from './pages/CommunityPage'
import ApprovalPage  from './pages/ApprovalPage'
import ReportPage    from './pages/ReportPage'

export default function App() {
  return (
    <ToastProvider>
      {/* Persistent layers */}
      <VaultBackground />
      <VaultCursor />
      <VaultIntro />

      {/* Sidebar nav */}
      <VaultNav />

      {/* Main content area — offset by nav width */}
      <main style={{ marginLeft: 72, position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <Routes>
          <Route path="/"           element={<HomePage />} />
          <Route path="/audit"      element={<AuditPage />} />
          <Route path="/persona"    element={<PersonaPage />} />
          <Route path="/simulator"  element={<SimulatorPage />} />
          <Route path="/community"  element={<CommunityPage />} />
          <Route path="/approval"   element={<ApprovalPage />} />
          <Route path="/report"     element={<ReportPage />} />
        </Routes>
      </main>
    </ToastProvider>
  )
}
