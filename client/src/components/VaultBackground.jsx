import React, { useEffect, useRef } from 'react';
import './VaultBackground.css';

const VaultBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const particleColors = ['#D4AF37', '#8892A4', '#4A5568'];
    const numParticles = 80;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.6, // max ±0.3px/frame roughly
          vy: (Math.random() - 0.5) * 0.6,
          size: Math.random() * 1.5 + 0.5, // 0.5 to 2px
          opacity: Math.random() * 0.4 + 0.1, // 0.1 to 0.5
          color: particleColors[Math.floor(Math.random() * particleColors.length)]
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      // Reset alpha
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', resizeCanvas);
    
    // Initial setup
    resizeCanvas();
    initParticles();
    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="vault-bg-container">
      {/* LAYER A — SLOW AURORA */}
      <div className="aurora-blob-1"></div>
      <div className="aurora-blob-2"></div>

      {/* LAYER B — PARTICLE FIELD */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* LAYER C — GRID LINES */}
      <div className="grid-lines"></div>
    </div>
  );
};

export default VaultBackground;
