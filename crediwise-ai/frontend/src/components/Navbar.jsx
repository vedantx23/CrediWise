import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/',          label: 'Home' },
  { to: '/audit',     label: 'Shadow Audit' },
  { to: '/persona',   label: 'Persona' },
  { to: '/simulator', label: 'Life Events' },
  { to: '/community', label: 'Community' },
  { to: '/approval',  label: 'Approval Odds' },
  { to: '/report',    label: 'PDF Report' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-50 border-b border-vault-border bg-vault-bg/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-vault-gold flex items-center justify-center
                          shadow-[0_0_12px_rgba(245,200,66,0.5)] group-hover:shadow-[0_0_20px_rgba(245,200,66,0.7)]
                          transition-shadow">
            <span className="text-vault-bg font-mono font-black text-xs">CW</span>
          </div>
          <span className="font-semibold text-sm tracking-wide">
            Credi<span className="text-vault-gold">Wise</span>
            <span className="text-vault-muted font-normal">-AI</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === to
                  ? 'bg-vault-card text-vault-gold'
                  : 'text-vault-textDim hover:text-vault-text hover:bg-vault-card/50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
