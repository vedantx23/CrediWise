// Legacy ScanningAnimation — replaced by PersonaScan.jsx. Kept for reference.
export default function ScanningAnimation({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 bg-vault-bg flex items-center justify-center">
      <p className="text-vault-gold font-mono animate-pulse">Scanning...</p>
    </div>
  )
}
