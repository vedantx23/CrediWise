import React from 'react';
import './VaultCard.css';

const VaultCard = ({ children, className = '', isActive = false, ...props }) => {
  return (
    <div 
      className={`vault-card ${isActive ? 'active' : ''} ${className}`} 
      {...props}
    >
      <div className="vault-card-shimmer"></div>
      
      <div className="vault-card-corners">
        <span className="vault-card-corner tl"></span>
        <span className="vault-card-corner tr"></span>
        <span className="vault-card-corner bl"></span>
        <span className="vault-card-corner br"></span>
      </div>
      
      {/* Content wrapper ensures it sits above the background elements */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default VaultCard;
