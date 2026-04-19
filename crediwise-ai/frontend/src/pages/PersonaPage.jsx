import { useState, useCallback } from 'react'
import SpendForm from '../components/SpendForm.jsx'
import ScanningAnimation from '../components/ScanningAnimation.jsx'
import PersonaCard from '../components/PersonaCard.jsx'
import { runPersona } from '../api.js'

export default function PersonaPage() {
  const [phase,   setPhase]   = useState('form')   // 'form' | 'scanning' | 'result'
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(payload) {
    setLoading(true)
    setError(null)
    try {
      const data = await runPersona(payload)
      setResult(data)
      setPhase('scanning')   // kick off the scan animation
    } catch (e) {
      setError(e.message || 'Persona engine failed. Is the backend running?')
      setLoading(false)
    }
  }

  const handleScanComplete = useCallback(() => {
    setPhase('result')
    setLoading(false)
  }, [])

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Scan overlay */}
      {phase === 'scanning' && result && (
        <ScanningAnimation
          personaName={result.persona_name}
          personaEmoji={result.persona_emoji}
          onComplete={handleScanComplete}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-vault-muted text-xs font-mono mb-2">
          <span>🎭</span> PERSONA ENGINE
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Discover Your Financial Persona</h1>
        <p className="text-vault-textDim text-sm">
          Our ML classifier analyses your spend DNA and reveals your financial archetype.
          Takes 2 seconds.
        </p>
      </div>

      <div className={`grid gap-8 ${phase === 'result' ? 'lg:grid-cols-2' : ''}`}>

        {/* Form */}
        <div className="glass rounded-2xl border border-vault-border p-6">
          <h2 className="text-sm font-semibold text-vault-textDim uppercase tracking-wider
                         font-mono mb-5">Your Spend Profile</h2>
          <SpendForm
            onSubmit={handleSubmit}
            loading={loading}
            submitLabel="Reveal My Persona →"
          />
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        {phase === 'result' && result && (
          <div>
            <PersonaCard result={result} />
          </div>
        )}

      </div>

      {/* Persona previews */}
      {phase === 'form' && (
        <div className="mt-10">
          <p className="text-xs text-vault-muted font-mono uppercase tracking-wider mb-4">
            Which one are you?
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { emoji:'✈️', name:'Stealth Nomad',         hint:'High travel + international'},
              { emoji:'🛍️', name:'High-Street Architect', hint:'Dining + online shopping'},
              { emoji:'📊', name:'Reward Arbitrageur',    hint:'Multi-card optimizer'},
              { emoji:'🧘', name:'Frugal Zen Master',     hint:'Zero fee, low complexity'},
            ].map(p => (
              <div key={p.name}
                className="glass rounded-xl border border-vault-border p-4 text-center
                           hover:border-vault-gold/30 transition-colors cursor-default">
                <div className="text-3xl mb-2">{p.emoji}</div>
                <p className="text-sm font-semibold text-vault-text mb-1">{p.name}</p>
                <p className="text-xs text-vault-muted">{p.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  )
}
