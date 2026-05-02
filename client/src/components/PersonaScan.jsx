import { useEffect, useState } from 'react'

const ARCHETYPES = {
  'The Stealth Nomad':        'Master of miles. Invisible optimizer of travel rewards.',
  'The High-Street Architect':'Curator of experiences. Dining, shopping, living well.',
  'The Reward Arbitrageur':   'Cold math. Maximum cashback. Every rupee accounted for.',
  'The Frugal Zen Master':    'Zero waste. Zero fees. Absolute efficiency.',
}

const HEX_CHARS = '0123456789ABCDEF'
function randHex(len = 8) {
  let s = ''
  for (let i = 0; i < len; i++) {
    if (i > 0 && i % 2 === 0) s += ':'
    s += HEX_CHARS[Math.floor(Math.random() * 16)]
    s += HEX_CHARS[Math.floor(Math.random() * 16)]
  }
  return s
}

export default function PersonaScan({ persona, onDone }) {
  const [phase, setPhase]     = useState(0)
  const [hexes, setHexes]     = useState(['','','','','',''])
  const [line1, setLine1]     = useState('')
  const [line2, setLine2]     = useState('')
  const [line3, setLine3]     = useState('')
  const [showPersona, setShowPersona] = useState(false)
  const [exiting, setExiting] = useState(false)

  const typeText = (text, setter, delay, cb) => {
    let i = 0
    const iv = setInterval(() => {
      setter(text.slice(0, i + 1))
      i++
      if (i >= text.length) { clearInterval(iv); cb?.() }
    }, 35)
    return iv
  }

  useEffect(() => {
    if (!persona) return
    setPhase(1)

    // Hex flicker
    const hexIv = setInterval(() => {
      setHexes(Array.from({ length: 6 }, () => randHex(6)))
    }, 80)

    // Phase 2: typing at 800ms
    const t1 = setTimeout(() => {
      setPhase(2)
      clearInterval(hexIv)
      typeText('> analyzing spending DNA...', setLine1, 0, () => {
        setTimeout(() => typeText('> matching 1,247 behavioral patterns...', setLine2, 0, () => {
          setTimeout(() => typeText('> archetype identified.', setLine3, 0, () => {
            // Phase 3: reveal
            setTimeout(() => { setPhase(3); setShowPersona(true) }, 200)
          }), 100)
        }), 200)
      })
    }, 800)

    // Phase 4: exit at 2800ms
    const t2 = setTimeout(() => {
      setExiting(true)
      setTimeout(onDone, 400)
    }, 2800)

    return () => {
      clearInterval(hexIv)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [persona])

  return (
    <div className={`pscan-overlay ${exiting ? 'pscan-exit' : ''}`}>
      {/* Scanline */}
      {phase === 1 && <div className="pscan-line" />}

      {/* Hex strings in corners */}
      {phase === 1 && hexes.map((h, i) => (
        <div key={i} className={`pscan-hex hex-${i}`}>{h}</div>
      ))}

      {/* Analysis typing */}
      {phase >= 2 && (
        <div className="pscan-terminal">
          {line1 && <div className="pscan-line-text">{line1}</div>}
          {line2 && <div className="pscan-line-text">{line2}</div>}
          {line3 && <div className="pscan-line-text pscan-line-hot">{line3}</div>}
        </div>
      )}

      {/* Persona reveal */}
      {showPersona && (
        <div className="pscan-persona">
          <div className="pscan-persona-name">{persona}</div>
          <div className="pscan-persona-sub">
            {ARCHETYPES[persona] || 'Your unique financial archetype.'}
          </div>
        </div>
      )}

      <style>{`
        .pscan-overlay {
          position: fixed; inset: 0;
          background: rgba(3,5,8,0.98);
          z-index: 9980;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 24px;
        }
        .pscan-exit {
          animation: pscan-shatter 400ms var(--ease-vault) forwards;
        }
        @keyframes pscan-shatter {
          to { transform: scale(1.05); opacity: 0; }
        }
        .pscan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--gold-bright) 50%, transparent);
          animation: scan-sweep 0.8s var(--ease-vault) forwards;
          pointer-events: none;
        }
        .pscan-hex {
          position: fixed;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--gold-dim); letter-spacing: 0.05em;
        }
        .hex-0 { top: 40px;  left: 40px; }
        .hex-1 { top: 40px;  right: 40px; }
        .hex-2 { top: 50%;   left: 40px; transform: translateY(-50%); }
        .hex-3 { top: 50%;   right: 40px; transform: translateY(-50%); }
        .hex-4 { bottom: 40px; left: 40px; }
        .hex-5 { bottom: 40px; right: 40px; }

        .pscan-terminal {
          text-align: center;
          display: flex; flex-direction: column; gap: 8px;
          animation: fade-up 300ms var(--ease-vault);
        }
        .pscan-line-text {
          font-family: var(--font-mono); font-size: 13px;
          color: var(--plat-cool); letter-spacing: 0.05em;
        }
        .pscan-line-hot { color: var(--gold-hot); }

        .pscan-persona {
          text-align: center;
          animation: persona-bounce 500ms var(--ease-snap) forwards;
        }
        .pscan-persona-name {
          font-family: var(--font-display); font-weight: 300;
          font-size: clamp(36px, 6vw, 72px);
          color: var(--gold-bright); letter-spacing: 0.08em;
          line-height: 1;
        }
        .pscan-persona-sub {
          margin-top: 12px;
          font-family: var(--font-ui); font-weight: 300;
          font-size: 15px; color: var(--plat-cool);
          animation: fade-up 400ms 200ms var(--ease-vault) both;
        }
      `}</style>
    </div>
  )
}
