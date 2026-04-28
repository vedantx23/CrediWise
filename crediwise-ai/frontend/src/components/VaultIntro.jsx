import { useEffect, useState, useRef } from 'react'

const SEEN_KEY = 'vault_intro_seen'

export default function VaultIntro({ onDone }) {
  const [phase, setPhase]     = useState(0)
  const [aiText, setAiText]   = useState('')
  // start hidden if already seen — prevents permanent black overlay bug
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SEEN_KEY))
  const aiRef = useRef(null)

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) {
      onDone?.()
      return
    }
    // t=0: show
    setPhase(1)
    // t=200: line expands
    const t1 = setTimeout(() => setPhase(2), 700)
    // t=700: CREDIWISE
    const t2 = setTimeout(() => setPhase(3), 1100)
    // t=1100: AI types
    const t3 = setTimeout(() => {
      const letters = 'AI'.split('')
      let i = 0
      const iv = setInterval(() => {
        setAiText(prev => prev + letters[i])
        i++
        if (i >= letters.length) clearInterval(iv)
      }, 80)
    }, 1100)
    // t=1500: border
    const t4 = setTimeout(() => setPhase(4), 1500)
    // t=2000: fade out
    const t5 = setTimeout(() => {
      setPhase(5)
      setTimeout(() => {
        setVisible(false)
        sessionStorage.setItem(SEEN_KEY, '1')
        onDone?.()
      }, 600)
    }, 2000)

    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout)
  }, [])

  if (!visible) return null

  return (
    <div className={`vault-intro ${phase >= 5 ? 'fading' : ''}`} aria-hidden="true">
      {/* Line */}
      {phase >= 1 && (
        <div className="intro-line" />
      )}
      {/* CREDIWISE */}
      {phase >= 2 && (
        <div className="intro-title">CREDIWISE</div>
      )}
      {/* AI */}
      {phase >= 3 && (
        <div className="intro-sub">{aiText}</div>
      )}
      {/* SVG border rect */}
      {phase >= 4 && (
        <svg className="intro-border" viewBox="0 0 320 100" fill="none">
          <rect
            x="1" y="1" width="318" height="98"
            stroke="var(--gold-bright)" strokeWidth="1"
            strokeDasharray="836"
            strokeDashoffset="0"
            style={{
              animation: 'draw-border 400ms var(--ease-vault) forwards',
              strokeDashoffset: 836,
            }}
          />
        </svg>
      )}

      <style>{`
        .vault-intro {
          position: fixed; inset: 0;
          background: var(--bg-void);
          z-index: 9990;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .vault-intro.fading {
          animation: intro-fade-out 600ms var(--ease-vault) forwards;
        }
        .intro-line {
          width: 240px; height: 1px;
          background: var(--gold-bright);
          transform-origin: center;
          animation: intro-line-expand 500ms var(--ease-vault) forwards;
          margin-bottom: 24px;
        }
        .intro-title {
          font-family: var(--font-display);
          font-weight: 300;
          font-size: clamp(28px, 5vw, 52px);
          letter-spacing: 0.4em;
          color: var(--gold-bright);
          animation: fade-up 600ms var(--ease-vault) forwards;
        }
        .intro-sub {
          font-family: var(--font-ui);
          font-weight: 300;
          font-size: 13px;
          letter-spacing: 0.6em;
          color: var(--plat-cool);
          animation: fade-up 400ms var(--ease-vault) forwards;
          min-height: 16px;
        }
        .intro-border {
          position: absolute;
          width: 320px; height: 100px;
          overflow: visible;
        }
        @keyframes draw-border {
          from { stroke-dashoffset: 836; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
