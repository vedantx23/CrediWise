import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, ShieldCheck, CreditCard, Fingerprint,
  FileText, Users, TrendingUp,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',          icon: Home,         label: 'Home' },
  { to: '/audit',     icon: ShieldCheck,  label: 'Audit' },
  { to: '/persona',   icon: Fingerprint,  label: 'Persona' },
  { to: '/approval',  icon: CreditCard,   label: 'Cards' },
  { to: '/simulator', icon: TrendingUp,   label: 'Life Events' },
  { to: '/community', icon: Users,        label: 'Community' },
  { to: '/report',    icon: FileText,     label: 'Reports' },
]

export default function VaultNav() {
  const [expanded, setExpanded] = useState(false)

  return (
    <nav
      className="vault-nav"
      style={{ width: expanded ? 220 : 72 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo mark */}
      <div className="vault-nav-logo" title="CrediWise-AI">
        <svg
          width="32" height="32" viewBox="0 0 32 32" fill="none"
          className={`logo-c ${expanded ? 'spinning' : ''}`}
        >
          <path
            d="M26 16a10 10 0 1 1-1.5-5.3"
            stroke="var(--gold-bright)" strokeWidth="1.5"
            strokeLinecap="round" fill="none"
          />
          <path
            d="M21 16a5 5 0 1 1-.8-2.7"
            stroke="var(--gold-mid)" strokeWidth="1.5"
            strokeLinecap="round" fill="none"
          />
        </svg>
        {expanded && (
          <span className="vault-nav-brand">CrediWise</span>
        )}
      </div>

      {/* Nav items */}
      <ul className="vault-nav-list">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `vault-nav-item ${isActive ? 'active' : ''}`
              }
              data-hover
            >
              <span className="nav-icon-wrap">
                <Icon size={20} />
              </span>
              {expanded && <span className="nav-label">{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Version */}
      <div className="vault-nav-version">
        {expanded ? 'VAULT v2.0' : 'v2'}
      </div>

      <style>{`
        .vault-nav {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          background: var(--bg-surface);
          border-right: 1px solid var(--gold-dim);
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: hidden;
          transition: width var(--dur-mid) var(--ease-vault);
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
        .logo-c {
          flex-shrink: 0;
          transition: transform 800ms ease;
        }
        .logo-c.spinning {
          animation: rotate-full 800ms ease forwards;
        }
        .vault-nav-brand {
          font-family: var(--font-display);
          font-weight: 300;
          font-size: 16px;
          letter-spacing: 0.1em;
          color: var(--gold-bright);
          white-space: nowrap;
        }
        .vault-nav-list {
          list-style: none;
          margin: 0;
          padding: 12px 0;
          flex: 1;
          overflow: hidden;
        }
        .vault-nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 24px;
          color: var(--plat-muted);
          text-decoration: none;
          position: relative;
          transition: background var(--dur-fast) ease, color var(--dur-fast) ease;
          white-space: nowrap;
          overflow: hidden;
        }
        .vault-nav-item:hover {
          background: var(--bg-raised);
          color: var(--plat-white);
        }
        .vault-nav-item:hover .nav-icon-wrap svg {
          transform: rotate(8deg);
        }
        .vault-nav-item.active {
          color: var(--gold-bright);
        }
        .vault-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--gold-bright);
          border-radius: 0 2px 2px 0;
        }
        .nav-icon-wrap svg {
          transition: transform 180ms ease;
          flex-shrink: 0;
        }
        .nav-label {
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 400;
          color: inherit;
        }
        .vault-nav-version {
          padding: 16px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--plat-muted);
          border-top: 1px solid rgba(212,175,55,0.06);
          white-space: nowrap;
          overflow: hidden;
        }
      `}</style>
    </nav>
  )
}
