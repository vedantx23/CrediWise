// Legacy Navbar — replaced by VaultNav.jsx. Kept for reference.
import { Link } from 'react-router-dom'
export default function Navbar() {
  return (
    <nav className="bg-vault-surface border-b border-vault-border px-6 py-4 flex gap-6">
      <Link to="/"         className="text-vault-gold font-semibold">Home</Link>
      <Link to="/audit"    className="text-vault-textDim hover:text-white">Audit</Link>
      <Link to="/persona"  className="text-vault-textDim hover:text-white">Persona</Link>
    </nav>
  )
}
