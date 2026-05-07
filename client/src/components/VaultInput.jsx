import React from 'react';
import './VaultInput.css';

const VaultInput = ({ 
  label, 
  type = 'text', 
  isCurrency = false, 
  value, 
  onChange, 
  className = '',
  min,
  max,
  ...props 
}) => {
  
  if (type === 'range') {
    // Calculate percentage for slider fill
    const percent = ((value - min) / (max - min)) * 100;
    
    return (
      <div className={`vault-input-group ${className}`}>
        {label && <label className="vault-input-label">{label}</label>}
        <div className="vault-input-wrapper" style={{ padding: '8px 0' }}>
          <input 
            type="range" 
            className="vault-slider" 
            value={value} 
            onChange={onChange}
            min={min}
            max={max}
            style={{
              background: `linear-gradient(to right, var(--gold-mid) ${percent}%, var(--plat-muted) ${percent}%)`
            }}
            data-hover="true"
            {...props}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`vault-input-group ${className}`}>
      {label && <label className="vault-input-label">{label}</label>}
      <div className="vault-input-wrapper">
        {isCurrency && <span className="vault-input-prefix">₹</span>}
        <input 
          type={type} 
          className={`vault-input ${isCurrency ? 'currency' : ''}`}
          value={value}
          onChange={onChange}
          data-hover="true"
          {...props}
        />
      </div>
    </div>
  );
};

export default VaultInput;
