import React, { useEffect, useState } from 'react';
import './VaultIntro.css';

const VaultIntro = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if already seen
    if (sessionStorage.getItem('vault_intro_seen')) {
      setShouldRender(false);
      onComplete?.();
      return;
    }

    const timers = [];

    // t=200ms: Line
    timers.push(setTimeout(() => setStage(1), 200));

    // t=700ms: Main text
    timers.push(setTimeout(() => setStage(2), 700));

    // t=1100ms: Sub text starts
    timers.push(setTimeout(() => setStage(3), 1100));

    // t=1500ms: Border
    timers.push(setTimeout(() => setStage(4), 1500));

    // t=2000ms: Fade out container
    timers.push(setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('vault_intro_seen', 'true');
      onComplete?.();
    }, 2000));

    // t=2500ms: Remove from DOM
    timers.push(setTimeout(() => setShouldRender(false), 2500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (!shouldRender) return null;

  return (
    <div className={`vault-intro-container ${!isVisible ? 'fade-out' : ''}`}>
      <div className={`intro-line ${stage >= 1 ? 'animate' : ''}`}></div>
      
      <div className="intro-content-wrapper">
        <svg className="intro-svg-border" preserveAspectRatio="none">
          <rect 
            className={`intro-rect ${stage >= 4 ? 'animate' : ''}`}
            x="0" y="0" width="100%" height="100%" 
          />
        </svg>

        <h1 className={`intro-text-main ${stage >= 2 ? 'animate' : ''}`}>
          CREDIWISE
        </h1>
        
        <div className="intro-text-sub">
          <span className={`intro-char ${stage >= 3 ? 'animate' : ''}`} style={{ animationDelay: '0ms' }}>A</span>
          <span className={`intro-char ${stage >= 3 ? 'animate' : ''}`} style={{ animationDelay: '80ms' }}>I</span>
        </div>
      </div>
    </div>
  );
};

export default VaultIntro;
