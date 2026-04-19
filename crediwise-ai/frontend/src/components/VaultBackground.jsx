import { useEffect, useRef } from 'react'

export default function VaultBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const COLORS = ['#D4AF37', '#8892A4', '#4A5568']
    let particles = []
    let raf

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Init 80 particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x:   Math.random() * window.innerWidth,
        y:   Math.random() * window.innerHeight,
        vx:  (Math.random() - 0.5) * 0.3,
        vy:  (Math.random() - 0.5) * 0.3,
        r:   0.5 + Math.random() * 1.5,
        op:  0.1 + Math.random() * 0.4,
        col: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0)              p.x = canvas.width
        if (p.x > canvas.width)   p.x = 0
        if (p.y < 0)              p.y = canvas.height
        if (p.y > canvas.height)  p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.col
        ctx.globalAlpha = p.op
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="vault-bg-root" aria-hidden="true">
      {/* Layer A — slow aurora blobs (CSS only) */}
      <div className="aurora-blob aurora-a" />
      <div className="aurora-blob aurora-b" />

      {/* Layer B — particle field */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Layer C — grid (CSS background) */}
      <div className="vault-grid" />

      <style>{`
        .vault-bg-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .aurora-a {
          width: 900px; height: 900px;
          background: radial-gradient(circle, #D4AF3712 0%, transparent 70%);
          top: -200px; left: -300px;
          animation: drift-a 25s ease-in-out infinite alternate;
        }
        .aurora-b {
          width: 700px; height: 700px;
          background: radial-gradient(circle, #1A3A6A10 0%, transparent 70%);
          bottom: -150px; right: -200px;
          animation: drift-b 30s ease-in-out infinite alternate;
        }
        .particle-canvas {
          position: absolute;
          inset: 0;
          width: 100%; height: 100%;
        }
        .vault-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
      `}</style>
    </div>
  )
}
