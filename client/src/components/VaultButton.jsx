import React from 'react';
import './VaultButton.css';

const VaultButton = ({ 
  children, 
  variant = 'primary', // 'primary' | 'ghost' | 'danger'
  isLoading = false,
  className = '',
  ...props 
}) => {
  return (
    <button 
      className={`vault-btn vault-btn-${variant} ${isLoading ? 'loading' : ''} ${className}`}
      data-hover="true"
      disabled={isLoading || props.disabled}
      {...props}
    >
      <span className="btn-text" style={{ transition: 'opacity 200ms' }}>
        {children}
      </span>
      
      {isLoading && (
        <div className="btn-loader">
          <span className="btn-dot"></span>
          <span className="btn-dot"></span>
          <span className="btn-dot"></span>
        </div>
      )}
    </button>
  );
};

export default VaultButton;
