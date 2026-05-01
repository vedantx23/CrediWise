import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Instruments from './pages/Instruments';
import Recommend from './pages/Recommend';
import Profile from './pages/Profile';
import { CardProvider } from './context/CardContext';
import './index.css';
import AuditPage from './pages/AuditPage';
import VaultNav from './components/VaultNav';

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      <VaultNav />
      <main className="flex-1 ml-[72px] relative min-h-screen overflow-x-hidden">
        <Routes>
          <Route path="/" element={<AuditPage />} />
          <Route path="/cards" element={<Instruments />} />
          <Route path="/rewards" element={<Recommend />} />
          <Route path="/spending" element={<Expenses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/insights" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

import React, { useState, useEffect } from 'react';
import VaultBackground from './components/VaultBackground';
import VaultCursor from './components/VaultCursor';
import VaultIntro from './components/VaultIntro';

export default function App() {
  const [introDone, setIntroDone] = useState(() => {
    return !!sessionStorage.getItem('vault_intro_seen');
  });

  return (
    <AuthProvider>
      <CardProvider>
        <VaultCursor />
        <VaultBackground />
        <VaultIntro onComplete={() => setIntroDone(true)} />
        
        <div style={{
          opacity: introDone ? 1 : 0,
          transition: 'opacity 400ms ease',
          position: 'relative',
          zIndex: 1,
          height: '100%'
        }}>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-overlay)',
                  color: 'var(--plat-white)',
                  border: '1px solid var(--gold-dim)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                },
                success: { iconTheme: { primary: 'var(--status-pass-fg)', secondary: 'var(--bg-void)' } },
                error: { iconTheme: { primary: 'var(--status-crit-fg)', secondary: 'var(--bg-void)' } },
              }}
            />
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </div>
      </CardProvider>
    </AuthProvider>
  );
}
