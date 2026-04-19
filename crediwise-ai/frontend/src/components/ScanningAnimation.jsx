/**
 * ScanningAnimation.jsx — Full-screen persona scanning overlay
 * CSS scanline effect, 2-second scan, then persona fades in
 */
import { useEffect, useState } from 'react'

const SCAN_DURATION_MS = 2200

export default function ScanningAnimation({ onComplete, personaName, personaEmoji }) {
  const [phase, setPhase] = useState('scanning')  // 'scanning' | 'reveal'

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), SCAN_DURATION_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (phase === 'reveal') {
      // Give time to read, then call onComplete
      const t = setTimeout(() => onComplete?.(), 1600)
      return () => clearTimeout(t)
    }
  }, [phase, onComplete])

  return (
    <div className="scan-overlay">
      <div className="scanlines" />
      {phase === 'scanning' && <div className="scan-line" />}

      {/* Scanning phase */}
      {phase === 'scanning' && (
        <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
          <div className="w-20 h-20 rounded-full border-2 border-vault-gold/50
                          flex items-center justify-center animate-spin-slow">
            <div className="w-14 h-14 rounded-full border border-vault-gold/30
                            flex items-center justify-center">
              <span className="text-vault-gold text-2xl animate-pulse">⬡</span>
            </div>
          </div>
          <div>
            <p className="text-vault-gold font-mono text-sm tracking-[0.3em] uppercase animate-pulse-gold">
              Analysing spend DNA
            </p>
            <p className="text-vault-muted text-xs mt-2 font-mono">
              Running persona classifier…
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-64 h-0.5 bg-vault-border rounded-full overflow-hidden">
            <div
              className="h-full bg-vault-gold rounded-full"
              style={{
                width: '100%',
                animation: `progressFill ${SCAN_DURATION_MS}ms linear forwards`,
              }}
            />
          </div>
          <style>{`
            @keyframes progressFill {
              from { width: 0%; }
              to   { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Reveal phase */}
      {phase === 'reveal' && (
        <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8 animate-fade-in-up">
          <div className="text-7xl mb-2">{personaEmoji}</div>
          <p className="text-vault-gold font-mono text-xs tracking-[0.4em] uppercase">
            Your financial persona
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight">
            {personaName}
          </h1>
          <div className="w-24 h-0.5 bg-vault-gold/50 rounded-full mt-2" />
          <p className="text-vault-muted text-sm font-mono mt-1">
            Loading your profile…
          </p>
        </div>
      )}
    </div>
  )
}
