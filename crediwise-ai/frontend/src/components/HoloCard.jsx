import { useRef, useState } from 'react'

export default function HoloCard({ card }) {
  const containerRef = useRef(null)
  const [tilt, setTilt]    = useState({ x: 0, y: 0 })
  const [flipped, setFlipped] = useState(false)
  const [angle, setAngle]  = useState(0)

  const onMouseMove = e => {
    if (flipped) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    const rotX =  (e.clientY - cy) / rect.height * 20
    const rotY = -(e.clientX - cx) / rect.width  * 20
    const a    = ((e.clientX - rect.left) / rect.width) * 60
    setTilt({ x: rotX, y: rotY })
    setAngle(a)
  }

  const onMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setAngle(0)
  }

  const cardStyle = {
    transform: flipped
      ? 'perspective(1000px) rotateY(180deg)'
      : `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transition: flipped ? 'transform 700ms var(--ease-vault)' : 'transform 600ms ease',
  }

  const rates = card?.reward_categories || []
  const maxRate = rates.length ? Math.max(...rates.map(r => r.rate_percent)) : 0

  return (
    <div
      ref={containerRef}
      className="holo-scene"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => setFlipped(f => !f)}
      data-hover
    >
      <div className="holo-card" style={cardStyle}>
        {/* ── FRONT ── */}
        <div className="holo-face holo-front">
          <div className="holo-shimmer" style={{ '--holo-angle': `${angle}deg` }} />

          {/* Chip */}
          <div className="holo-chip">
            <div className="chip-grid" />
          </div>

          {/* Bank name */}
          <div className="holo-bank">{card?.bank || 'BANK'}</div>

          {/* Card name */}
          <div className="holo-name">{card?.name || 'Premium Card'}</div>

          {/* PAN */}
          <div className="holo-pan">•••• •••• •••• {card?.last4 || '4242'}</div>

          {/* Valid + Network */}
          <div className="holo-footer">
            <span className="holo-valid">VALID THRU<br />12/27</span>
            <svg className="holo-network" viewBox="0 0 48 24" fill="none">
              <circle cx="18" cy="12" r="10" fill="var(--gold-mid)" opacity="0.8" />
              <circle cx="30" cy="12" r="10" fill="var(--gold-bright)" opacity="0.7" />
            </svg>
          </div>

          {/* Edge glow */}
          <div className="holo-edge-glow" />
        </div>

        {/* ── BACK ── */}
        <div className="holo-face holo-back">
          <div className="holo-back-title">Reward Rates</div>
          <div className="holo-rates-grid">
            {rates.length ? rates.map(r => (
              <div key={r.category} className="rate-row">
                <span className="rate-cat">{r.category}</span>
                <span
                  className={`rate-val ${r.rate_percent === maxRate ? 'rate-top' : ''}`}
                >
                  {r.rate_percent.toFixed(1)}%
                </span>
              </div>
            )) : (
              <div className="rate-row">
                <span className="rate-cat">All categories</span>
                <span className="rate-val">1.0%</span>
              </div>
            )}
          </div>
          <div className="holo-back-hint">Click to flip</div>
        </div>
      </div>

      <style>{`
        .holo-scene {
          width: 380px; height: 240px;
          perspective: 1000px;
          cursor: none;
        }
        .holo-card {
          width: 100%; height: 100%;
          transform-style: preserve-3d;
          position: relative;
        }
        .holo-face {
          position: absolute; inset: 0;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #0D1219 0%, #1A2332 50%, #0D1219 100%);
          box-shadow:
            0 0 0 1px rgba(212,175,55,0.2),
            0 20px 60px rgba(0,0,0,0.8),
            0 0 40px rgba(212,175,55,0.08);
        }
        .holo-back { transform: rotateY(180deg); padding: 24px; }

        /* Holographic shimmer overlay */
        .holo-shimmer {
          position: absolute; inset: 0;
          background: conic-gradient(
            from var(--holo-angle, 0deg),
            transparent 0deg,
            rgba(212,175,55,0.15) 60deg,
            rgba(100,180,255,0.1) 120deg,
            transparent 180deg,
            rgba(212,175,55,0.08) 240deg,
            transparent 360deg
          );
          mix-blend-mode: screen;
          animation: hologram 8s linear infinite;
          pointer-events: none;
        }
        @property --holo-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes hologram { to { --holo-angle: 360deg; } }

        /* Chip */
        .holo-chip {
          position: absolute;
          top: 56px; left: 28px;
          width: 32px; height: 24px;
          border-radius: 4px;
          background: linear-gradient(135deg, var(--gold-mid), var(--gold-dim));
          overflow: hidden;
        }
        .chip-grid {
          width: 100%; height: 100%;
          background-image:
            linear-gradient(var(--gold-dim) 1px, transparent 1px),
            linear-gradient(90deg, var(--gold-dim) 1px, transparent 1px);
          background-size: 8px 8px;
          opacity: 0.4;
        }

        .holo-bank {
          position: absolute;
          top: 20px; left: 28px;
          font-family: var(--font-ui); font-size: 11px; font-weight: 500;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--plat-cool);
        }
        .holo-name {
          position: absolute;
          top: 100px; left: 28px; right: 28px;
          font-family: var(--font-display); font-size: 22px; font-weight: 300;
          color: var(--plat-white);
          letter-spacing: 0.02em;
        }
        .holo-pan {
          position: absolute;
          bottom: 44px; left: 28px;
          font-family: var(--font-mono); font-size: 13px;
          color: var(--plat-cool); letter-spacing: 0.15em;
        }
        .holo-footer {
          position: absolute;
          bottom: 16px; left: 28px; right: 28px;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .holo-valid {
          font-family: var(--font-mono); font-size: 9px;
          color: var(--plat-muted); letter-spacing: 0.05em;
          text-transform: uppercase; line-height: 1.4;
        }
        .holo-network { width: 48px; height: 24px; }
        .holo-edge-glow {
          position: absolute; inset: 0;
          border-radius: 16px;
          box-shadow: inset 0 0 40px rgba(212,175,55,0.04);
          pointer-events: none;
        }

        /* Back face */
        .holo-back-title {
          font-family: var(--font-display); font-size: 18px; font-weight: 300;
          color: var(--gold-bright); letter-spacing: 0.1em;
          margin-bottom: 16px; border-bottom: 1px solid var(--gold-dim);
          padding-bottom: 8px;
        }
        .holo-rates-grid { display: flex; flex-direction: column; gap: 6px; }
        .rate-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 4px 0;
        }
        .rate-cat {
          font-family: var(--font-ui); font-size: 11px; font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--plat-cool);
        }
        .rate-val {
          font-family: var(--font-mono); font-size: 13px;
          color: var(--gold-hot);
        }
        .rate-top {
          color: var(--gold-bright);
          animation: pulse-crit 2s ease infinite;
        }
        .holo-back-hint {
          position: absolute; bottom: 14px; right: 24px;
          font-family: var(--font-mono); font-size: 9px;
          color: var(--plat-muted); letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  )
}
