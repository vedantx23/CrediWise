import React, { useState, useEffect } from 'react';

const PersonaScanner = ({ onComplete, persona }) => {
  const [phase, setPhase] = useState('scanning'); // scanning -> revealing -> done

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('revealing');
      setTimeout(() => {
        setPhase('done');
      }, 1500);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (phase === 'done') return null;

  return (
    <div className="scanning-overlay">
      {phase === 'scanning' && (
        <>
          <div className="scanline"></div>
          <div className="text-gold text-2xl font-bold animate-pulse uppercase tracking-[0.5em]">
            Analyzing Spend DNA
          </div>
          <div className="text-platinum/50 text-xs mt-4 font-mono">
            SECURE ACCESS: TERMINAL 09-X
          </div>
        </>
      )}

      {phase === 'revealing' && (
        <div className="text-center animate-in fade-in zoom-in duration-700">
          <div className="text-sm text-platinum/50 uppercase tracking-widest mb-2">Persona Identified</div>
          <div className="text-5xl font-black gold-gradient-text uppercase tracking-tighter">
            {persona?.persona_name}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaScanner;
