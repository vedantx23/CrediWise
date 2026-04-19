import { Routes, Route } from 'react-router-dom'
import Navbar        from './components/Navbar.jsx'
import HomePage      from './pages/HomePage.jsx'
import AuditPage     from './pages/AuditPage.jsx'
import PersonaPage   from './pages/PersonaPage.jsx'
import SimulatorPage from './pages/SimulatorPage.jsx'
import CommunityPage from './pages/CommunityPage.jsx'
import ApprovalPage  from './pages/ApprovalPage.jsx'
import ReportPage    from './pages/ReportPage.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-vault-bg text-vault-text">
      <Navbar />
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/audit"      element={<AuditPage />} />
        <Route path="/persona"    element={<PersonaPage />} />
        <Route path="/simulator"  element={<SimulatorPage />} />
        <Route path="/community"  element={<CommunityPage />} />
        <Route path="/approval"   element={<ApprovalPage />} />
        <Route path="/report"     element={<ReportPage />} />
      </Routes>
    </div>
  )
}
