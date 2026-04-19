import { useState } from 'react'
import SpendForm from '../components/SpendForm.jsx'
import AuditResult from '../components/AuditResult.jsx'
import { runAudit } from '../api.js'

export default function AuditPage() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  async function handleSubmit(payload) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAudit(payload)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Audit failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-vault-muted text-xs font-mono mb-2">
          <span>🔍</span> SHADOW AUDIT ENGINE
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Your Wallet Audit</h1>
        <p className="text-vault-textDim text-sm">
          Enter your monthly spend by category. We'll calculate exactly how much
          you're leaving on the table — and which cards fix it.
        </p>
      </div>

      <div className={`grid gap-8 ${result ? 'lg:grid-cols-2' : ''}`}>

        {/* Form column */}
        <div className="glass rounded-2xl border border-vault-border p-6">
          <h2 className="text-sm font-semibold text-vault-textDim uppercase tracking-wider
                         font-mono mb-5">Monthly Spend Profile</h2>
          <SpendForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Run Shadow Audit →"
          />
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Result column */}
        {result && (
          <div>
            <AuditResult result={result} />
          </div>
        )}

      </div>

      {/* How it works */}
      {!result && (
        <div className="mt-10 glass rounded-xl border border-vault-border p-6">
          <h3 className="text-sm font-semibold text-vault-text mb-4">How the audit works</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-vault-muted">
            <div className="flex gap-3">
              <span className="text-vault-gold font-mono font-bold">01</span>
              <div>
                <p className="text-vault-textDim font-medium mb-1">Current NAV</p>
                <p>Best reward rate across cards you own × 12 months</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-vault-gold font-mono font-bold">02</span>
              <div>
                <p className="text-vault-textDim font-medium mb-1">Optimal NAV</p>
                <p>Best reward rate across all 16 cards in our database × 12</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-vault-gold font-mono font-bold">03</span>
              <div>
                <p className="text-vault-textDim font-medium mb-1">Leakage</p>
                <p>Optimal − Current = money you leave behind every year</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
