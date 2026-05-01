import React, { useEffect, useRef, useState } from 'react';
import './VaultCursor.css';

const VaultCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const poolRef = useRef([]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Mouse tracking
  const mouse = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Hide default cursor globally
    const style = document.createElement('style');
    style.innerHTML = `* { cursor: none !important; }`;
    document.head.appendChild(style);

    // Initialize particle pool (20 divs)
    const pool = [];
    for (let i = 0; i < 20; i++) {
      pool.push({
        active: false,
        element: null,
        startTime: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0
      });
    }
    poolRef.current = pool;

    let rAF;

    const onMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (dotRef.current) {
        // Dot follows instantly
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) ${isMouseDown ? 'scale(0.6)' : 'scale(1)'}`;
      }

      // Check velocity for particles
      const vx = e.clientX - lastMouse.current.x;
      const vy = e.clientY - lastMouse.current.y;
      const velocity = Math.sqrt(vx * vx + vy * vy);

      if (velocity > 8) {
        emitParticles(e.clientX, e.clientY, vx, vy);
      }

      lastMouse.current.x = e.clientX;
      lastMouse.current.y = e.clientY;
    };

    const emitParticles = (x, y, vx, vy) => {
      let count = 0;
      for (let i = 0; i < poolRef.current.length && count < 4; i++) {
        const p = poolRef.current[i];
        if (!p.active && p.element) {
          p.active = true;
          p.startTime = performance.now();
          p.x = x;
          p.y = y;
          // Move opposite to mouse velocity at 10% speed, plus some randomness
          p.vx = -vx * 0.1 + (Math.random() - 0.5) * 2;
          p.vy = -vy * 0.1 + (Math.random() - 0.5) * 2;
          
          p.element.style.transform = `translate(${p.x}px, ${p.y}px)`;
          p.element.style.opacity = '0.4';
          p.element.style.transition = 'none'; // reset transition
          
          // Force reflow
          p.element.getBoundingClientRect();
          
          // Start animation
          p.element.style.transition = 'opacity 400ms linear, transform 400ms linear';
          p.element.style.opacity = '0';
          p.element.style.transform = `translate(${p.x + p.vx * 10}px, ${p.y + p.vy * 10}px)`;

          count++;
        }
      }
    };

    const updateRing = () => {
      // Lerp ring
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.12;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px)`;
      }

      // Free old particles
      const now = performance.now();
      for (let i = 0; i < poolRef.current.length; i++) {
        const p = poolRef.current[i];
        if (p.active && now - p.startTime > 400) {
          p.active = false;
        }
      }

      rAF = requestAnimationFrame(updateRing);
    };

    const onMouseDown = () => {
      setIsMouseDown(true);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x}px, ${mouse.current.y}px) scale(0.6)`;
      }
    };
    const onMouseUp = () => {
      setIsMouseDown(false);
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x}px, ${mouse.current.y}px) scale(1)`;
      }
    };

    const onMouseOver = (e) => {
      if (e.target.closest('a, button, [data-hover]')) {
        setIsHovering(true);
      }
    };

    const onMouseOut = (e) => {
      if (e.target.closest('a, button, [data-hover]')) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    rAF = requestAnimationFrame(updateRing);

    return () => {
      document.head.removeChild(style);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(rAF);
    };
  }, [isMouseDown]);

  return (
    <div className="vault-cursor-container">
      {/* Pool of particles */}
      {poolRef.current.map((p, i) => (
        <div
          key={i}
          ref={(el) => (poolRef.current[i].element = el)}
          className="cursor-trail-particle"
        ></div>
      ))}
      <div 
        ref={ringRef} 
        className={`cursor-ring ${isHovering ? 'hovering' : ''}`}
      ></div>
      <div 
        ref={dotRef} 
        className="cursor-dot"
      ></div>
    </div>
  );
};

export default VaultCursor;
