import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, ShieldCheck, Fingerprint, CreditCard,
  TrendingUp, Users, FileText, Wallet, Zap,
  BarChart3, User, LogOut, MessageCircle, Target,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: null, // no section header
    items: [
      { to: '/',           icon: Home,        label: 'Home' },
    ],
  },
  {
    label: 'AI Intelligence',
    items: [
      { to: '/optimizer',  icon: Target,      label: 'Optimizer' },
      { to: '/audit',      icon: ShieldCheck, label: 'Audit' },
      { to: '/persona',    icon: Fingerprint, label: 'Persona' },
      { to: '/approval',   icon: CreditCard,  label: 'Approval' },
      { to: '/boardroom',  icon: MessageCircle, label: 'AI Boardroom' },
    ],
  },
  {
    label: 'My Wallet',
    items: [
      { to: '/cards',      icon: Wallet,      label: 'Cards' },
      { to: '/spending',   icon: BarChart3,   label: 'Spending' },
      { to: '/rewards',    icon: Zap,         label: 'Rewards' },
      { to: '/insights',   icon: BarChart3,   label: 'Dashboard' },
      { to: '/profile',    icon: User,        label: 'Profile' },
    ],
  },
];

export default function VaultNav() {
  const [expanded, setExpanded] = React.useState(false);
  const { logout } = useAuth();

  return (
    <nav
      className="vault-nav"
      style={{ width: expanded ? 220 : 72 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="vault-nav-logo" title="CrediWise">
        <div className="logo-mark">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
            className={`logo-c ${expanded ? 'spinning' : ''}`}>
            <path d="M26 16a10 10 0 1 1-1.5-5.3"
              stroke="var(--gold-bright)" strokeWidth="1.5"
              strokeLinecap="round" fill="none" />
            <path d="M21 16a5 5 0 1 1-.8-2.7"
              stroke="var(--gold-mid)" strokeWidth="1.5"
              strokeLinecap="round" fill="none" />
          </svg>
        </div>
        {expanded && (
          <span className="vault-nav-brand">CrediWise</span>
        )}
      </div>

      {/* Nav sections */}
      <div className="vault-nav-list">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className="nav-section">
            {section.label && expanded && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {!section.label && !expanded && null}
            {section.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `vault-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon-wrap">
                  <Icon size={20} />
                </span>
                {expanded && <span className="nav-label">{label}</span>}
                {!expanded && (
                  <div className="nav-tooltip">{label}</div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Logout button */}
      <button
        className="vault-nav-item logout-btn"
        onClick={logout}
        title="Logout"
      >
        <span className="nav-icon-wrap">
          <LogOut size={20} />
        </span>
        {expanded && <span className="nav-label">Logout</span>}
      </button>

      {/* Version tag */}
      <div className="vault-nav-version">
        {expanded ? 'VAULT v2.0' : 'v2'}
      </div>

      <style>{`
        .vault-nav {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          background: var(--bg-surface, #080C12);
          border-right: 1px solid var(--gold-dim, #7A5C1E);
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: hidden;
          transition: width 280ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: width;
        }
        .vault-nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-bottom: 1px solid rgba(212,175,55,0.08);
          height: 72px;
          overflow: hidden;
        }
        .logo-mark { flex-shrink: 0; }
        .logo-c {
          transition: transform 800ms ease;
        }
        .logo-c.spinning {
          animation: rotate-full 800ms ease forwards;
        }
        @keyframes rotate-full {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .vault-nav-brand {
          font-family: var(--font-display, Georgia);
          font-weight: 300;
          font-size: 16px;
          letter-spacing: 0.1em;
          color: var(--gold-bright, #D4AF37);
          white-space: nowrap;
        }
        .vault-nav-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 0;
        }
        .nav-section {
          margin-bottom: 4px;
        }
        .nav-section-label {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--plat-muted, #4A5568);
          padding: 16px 24px 6px;
          white-space: nowrap;
        }
        .vault-nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 24px;
          color: var(--plat-muted, #4A5568);
          text-decoration: none;
          position: relative;
          transition: background 120ms ease, color 120ms ease;
          white-space: nowrap;
          overflow: hidden;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: var(--font-ui, sans-serif);
        }
        .vault-nav-item:hover {
          background: var(--bg-raised, #0D1219);
          color: var(--plat-white, #E8EDF2);
        }
        .vault-nav-item:hover .nav-icon-wrap svg {
          transform: rotate(8deg);
        }
        .vault-nav-item.active {
          color: var(--gold-bright, #D4AF37);
        }
        .vault-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--gold-bright, #D4AF37);
          border-radius: 0 2px 2px 0;
        }
        .nav-icon-wrap svg {
          transition: transform 180ms ease;
          flex-shrink: 0;
        }
        .nav-label {
          font-size: 13px;
          font-weight: 400;
          color: inherit;
        }
        .nav-tooltip {
          position: absolute;
          left: 100%;
          margin-left: 12px;
          padding: 4px 10px;
          background: var(--gold-bright, #D4AF37);
          color: #0a0a10;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 6px;
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          transition: opacity 150ms ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .vault-nav-item:hover .nav-tooltip {
          opacity: 1;
        }
        .logout-btn {
          border-top: 1px solid rgba(212,175,55,0.06);
          padding: 14px 24px;
          color: var(--status-crit-fg, #F87171);
        }
        .logout-btn:hover {
          background: rgba(248, 113, 113, 0.08);
          color: var(--status-crit-fg, #F87171);
        }
        .vault-nav-version {
          padding: 12px 16px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--plat-muted, #4A5568);
          border-top: 1px solid rgba(212,175,55,0.06);
          white-space: nowrap;
          overflow: hidden;
        }
      `}</style>
    </nav>
  );
}
