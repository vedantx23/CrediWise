import React, { useRef, useState } from 'react';
import './HoloCard.css';

const HoloCard = ({ 
  bankName = 'RESERVE BANK', 
  cardName = 'OBSIDIAN INFINITE',
  cardNumber = '•••• •••• •••• 4242',
  expiry = '12/27',
  rates = [
    { category: 'Travel', rate: '5%' },
    { category: 'Dining', rate: '3%' },
    { category: 'Online', rate: '2%' },
    { category: 'Other', rate: '1%' }
  ]
}) => {
  const containerRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0)');
  const [bgTransform, setBgTransform] = useState('translate(0, 0)');

  const handleMouseMove = (e) => {
    if (isFlipped) return; // Don't tilt when flipped
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      const centerX = rect.left + width / 2;
      const centerY = rect.top + height / 2;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Calculate rotation
      const rotX = ((mouseY - centerY) / height) * 20; // up to 10 deg
      const rotY = ((mouseX - centerX) / width) * -20;
      
      setTransform(`perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`);
      
      // Shift background for the hologram
      const bgX = ((mouseX - centerX) / width) * 20;
      const bgY = ((mouseY - centerY) / height) * 20;
      setBgTransform(`translate(${bgX}%, ${bgY}%)`);
    }
  };

  const handleMouseLeave = () => {
    if (isFlipped) return;
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
    setBgTransform('translate(0, 0)');
  };

  const handleClick = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
    }
  };

  return (
    <div 
      className="holo-container" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-hover="true"
    >
      <div 
        className={`holo-card-inner ${isFlipped ? 'flipped' : ''}`}
        style={{ transform }}
      >
        {/* Front Face */}
        <div className="holo-face front">
          <style>{`
            .holo-face.front::before {
              transform: ${bgTransform};
            }
          `}</style>
          
          <div className="holo-content">
            <div className="holo-top">
              <span className="holo-bank">{bankName}</span>
              <div className="holo-network">
                {/* SVG for a network logo (e.g. interlocking circles) */}
                <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="35" cy="30" r="20" fillOpacity="0.8"/>
                  <circle cx="65" cy="30" r="20" fillOpacity="0.8"/>
                </svg>
              </div>
            </div>
            
            <div className="holo-chip"></div>
            
            <div className="holo-name">{cardName}</div>
            
            <div className="holo-bottom">
              <div className="holo-number">{cardNumber}</div>
              <div className="holo-expiry">
                <span className="holo-expiry-label">VALID THRU</span>
                {expiry}
              </div>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div className="holo-face back">
          <div className="holo-magstripe"></div>
          
          <div className="holo-back-title">Reward Rates</div>
          
          <div className="holo-rates-grid">
            {rates.map((r, i) => (
              <div className="holo-rate-item" key={i}>
                <span className="holo-rate-cat">{r.category}</span>
                <span className={`holo-rate-val ${i === 0 ? 'pulse' : ''}`}>{r.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoloCard;
