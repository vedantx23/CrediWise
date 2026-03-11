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

function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cards" element={<Instruments />} />
          <Route path="/rewards" element={<Recommend />} />
          <Route path="/spending" element={<Expenses />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/insights" element={<Dashboard />} />
        </Routes>
      </div>
    </div>
  );
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <CardProvider>
        <BrowserRouter>
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
              success: { iconTheme: { primary: '#10b981', secondary: '#0a0e1a' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0a0e1a' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </CardProvider>
    </AuthProvider>
  );
}
