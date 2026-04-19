import { useEffect, useRef, useState } from 'react'

const POOL_SIZE = 20

export default function VaultCursor() {
  const dotRef   = useRef(null)
  const ringRef  = useRef(null)
  const poolRef  = useRef([])
  const mouse    = useRef({ x: 0, y: 0 })
  const ring     = useRef({ x: 0, y: 0 })
  const prev     = useRef({ x: 0, y: 0 })
  const rafRef   = useRef(null)
  const poolIdx  = useRef(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
    const dot  = dotRef.current
    const ringEl = ringRef.current
    if (!dot || !ringEl) return

    const onMove = e => {
      const mx = e.clientX, my = e.clientY
      const vx = mx - prev.current.x
      const vy = my - prev.current.y
      prev.current = { x: mx, y: my }
      mouse.current = { x: mx, y: my }

      // Dot follows exactly
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`

      // Trail on fast movement
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > 8) {
        for (let i = 0; i < 4; i++) {
          const el = poolRef.current[poolIdx.current % POOL_SIZE]
          poolIdx.current++
          if (!el) continue
          el.style.left   = `${mx}px`
          el.style.top    = `${my}px`
          el.style.opacity = '0.4'
          el.style.transform = 'translate(-50%,-50%) scale(1)'
          el.style.transition = 'none'
          requestAnimationFrame(() => {
            el.style.transition = 'opacity 400ms ease, transform 400ms ease'
            el.style.transform  = `translate(calc(-50% + ${-vx * 0.1 * (i+1)}px), calc(-50% + ${-vy * 0.1 * (i+1)}px)) scale(0)`
            el.style.opacity    = '0'
          })
        }
      }
    }

    const onDown = () => { dot.style.transform += ' scale(0.6)' }
    const onUp   = () => { dot.style.transform = dot.style.transform.replace(' scale(0.6)', '') }

    const targets = document.querySelectorAll('a, button, [data-hover]')
    const addHover   = () => { ringEl.classList.add('ring-hover') }
    const removeHover= () => { ringEl.classList.remove('ring-hover') }
    targets.forEach(t => { t.addEventListener('mouseenter', addHover); t.addEventListener('mouseleave', removeHover) })

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup',   onUp)

    const animate = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12
      ringEl.style.transform = `translate(${ring.current.x - 16}px, ${ring.current.y - 16}px)`
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup',   onUp)
      cancelAnimationFrame(rafRef.current)
    }
  }, [ready])

  if (!ready) return null

  return (
    <>
      <style>{`
        * { cursor: none !important; }
        .vault-cursor-dot {
          position: fixed; top: 0; left: 0;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--gold-bright);
          pointer-events: none;
          z-index: 10000;
          will-change: transform;
        }
        .vault-cursor-ring {
          position: fixed; top: 0; left: 0;
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(212,175,55,0.5);
          background: transparent;
          pointer-events: none;
          z-index: 9999;
          transition: width 200ms var(--ease-vault),
                      height 200ms var(--ease-vault),
                      border-color 200ms var(--ease-vault),
                      background 200ms var(--ease-vault);
          will-change: transform;
        }
        .vault-cursor-ring.ring-hover {
          width: 48px; height: 48px;
          border-color: var(--gold-bright);
          background: var(--gold-glow);
          margin: -8px;
        }
        .vault-trail-dot {
          position: fixed; top: 0; left: 0;
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--gold-bright);
          pointer-events: none;
          z-index: 9998;
        }
      `}</style>

      <div ref={dotRef}  className="vault-cursor-dot" />
      <div ref={ringRef} className="vault-cursor-ring" />

      {/* Trail particle pool */}
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <div
          key={i}
          ref={el => { poolRef.current[i] = el }}
          className="vault-trail-dot"
          style={{ opacity: 0 }}
        />
      ))}
    </>
  )
}
