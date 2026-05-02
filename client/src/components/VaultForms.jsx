import { useState } from 'react'

/* ══════════════════════════════════════════
   VaultButton — variant: 'primary' | 'ghost'
══════════════════════════════════════════ */
export function VaultButton({
  children,
  variant = 'primary',
  loading = false,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`vault-btn vault-btn--${variant} ${loading ? 'loading' : ''} ${className}`}
      data-hover
      {...props}
    >
      {loading ? (
        <span className="btn-dots">
          <span /><span /><span />
        </span>
      ) : children}

      <style>{`
        .vault-btn {
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 12px 28px;
          border-radius: var(--radius-sm);
          border: none;
          cursor: none;
          transition:
            background var(--dur-mid) var(--ease-vault),
            border-color var(--dur-mid) var(--ease-vault),
            box-shadow var(--dur-mid) var(--ease-vault),
            transform var(--dur-fast) ease,
            color var(--dur-mid);
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .vault-btn:disabled { opacity: 0.5; pointer-events: none; }

        /* Primary */
        .vault-btn--primary {
          background: transparent;
          border: 1px solid var(--gold-mid);
          color: var(--gold-bright);
        }
        .vault-btn--primary:hover {
          background: var(--gold-glow);
          border-color: var(--gold-bright);
          color: var(--gold-hot);
          box-shadow: 0 0 20px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.05);
          transform: translateY(-1px);
        }
        .vault-btn--primary:active { transform: translateY(0) scale(0.98); }

        /* Ghost */
        .vault-btn--ghost {
          background: transparent;
          border: none;
          color: var(--plat-cool);
        }
        .vault-btn--ghost:hover {
          color: var(--plat-white);
          text-decoration: underline;
          text-decoration-color: var(--gold-dim);
        }

        /* Loading dots */
        .btn-dots {
          display: inline-flex; gap: 4px; align-items: center;
        }
        .btn-dots span {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--gold-bright);
          animation: dot-pulse 0.9s ease infinite;
        }
        .btn-dots span:nth-child(2) { animation-delay: 0.3s; }
        .btn-dots span:nth-child(3) { animation-delay: 0.6s; }
        @keyframes dot-pulse {
          0%,80%,100% { opacity: 0.2; transform: scale(0.8); }
          40%          { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </button>
  )
}

/* ══════════════════════════════════════════
   VaultInput — label + styled input
══════════════════════════════════════════ */
export function VaultInput({
  label,
  currency = false,
  type = 'text',
  className = '',
  ...props
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className={`vault-input-wrap ${className}`}>
      {label && (
        <label className={`vault-input-label ${focused ? 'focused' : ''}`}>
          {label}
        </label>
      )}
      <div className={`vault-input-inner ${focused ? 'focused' : ''}`}>
        {currency && (
          <span className={`vault-input-prefix ${focused ? 'focused' : ''}`}>₹</span>
        )}
        <input
          type={type}
          className={`vault-input-el ${currency ? 'currency' : ''}`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        <span className="vault-input-underline" />
      </div>

      <style>{`
        .vault-input-wrap { display: flex; flex-direction: column; gap: 6px; }

        .vault-input-label {
          font-family: var(--font-ui);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--plat-muted);
          transition: color var(--dur-fast);
        }
        .vault-input-label.focused { color: var(--gold-bright); }

        .vault-input-inner {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg-void);
          border: 1px solid var(--plat-muted);
          border-radius: var(--radius-sm);
          transition:
            border-color var(--dur-mid),
            box-shadow var(--dur-mid);
          overflow: hidden;
        }
        .vault-input-inner.focused {
          border-color: var(--gold-mid);
          box-shadow: 0 0 0 3px rgba(212,175,55,0.1), 0 0 20px rgba(212,175,55,0.08);
        }

        .vault-input-prefix {
          font-family: var(--font-mono);
          font-size: 14px;
          color: var(--gold-dim);
          padding: 0 0 0 14px;
          flex-shrink: 0;
          transition: color var(--dur-fast);
          user-select: none;
        }
        .vault-input-prefix.focused { color: var(--gold-bright); }

        .vault-input-el {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 300;
          color: var(--plat-white);
          padding: 12px 16px;
        }
        .vault-input-el.currency {
          font-family: var(--font-mono);
          text-align: right;
          color: var(--gold-hot);
          padding-left: 6px;
        }
        .vault-input-el::placeholder { color: var(--plat-muted); }

        /* Bottom underline that grows on focus */
        .vault-input-underline {
          position: absolute;
          bottom: 0; left: 0;
          height: 1px;
          width: 100%;
          background: var(--gold-bright);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform var(--dur-mid) var(--ease-vault);
        }
        .vault-input-inner.focused .vault-input-underline {
          transform: scaleX(1);
        }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════
   VaultSlider
══════════════════════════════════════════ */
export function VaultSlider({ label, min, max, value, onChange, format, className = '' }) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={`vault-slider-wrap ${className}`}>
      {label && (
        <div className="vault-slider-header">
          <span className="vault-slider-label">{label}</span>
          <span className="vault-slider-value">{format ? format(value) : value}</span>
        </div>
      )}
      <div className="vault-slider-track-wrap">
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="vault-slider-el"
          style={{ '--pct': `${pct}%` }}
        />
      </div>

      <style>{`
        .vault-slider-wrap { display: flex; flex-direction: column; gap: 8px; }
        .vault-slider-header {
          display: flex; justify-content: space-between; align-items: baseline;
        }
        .vault-slider-label {
          font-family: var(--font-ui); font-size: 10px; font-weight: 500;
          letter-spacing: 0.15em; text-transform: uppercase; color: var(--plat-muted);
        }
        .vault-slider-value {
          font-family: var(--font-mono); font-size: 13px; color: var(--gold-hot);
        }
        .vault-slider-el {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 2px;
          background: linear-gradient(
            to right,
            var(--gold-mid) 0%,
            var(--gold-mid) var(--pct, 50%),
            var(--plat-muted) var(--pct, 50%),
            var(--plat-muted) 100%
          );
          border-radius: 1px;
          outline: none;
          cursor: none;
        }
        .vault-slider-el::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--gold-bright);
          transition: transform var(--dur-fast), box-shadow var(--dur-fast);
        }
        .vault-slider-el::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px rgba(212,175,55,0.15);
        }
        .vault-slider-el:active::-webkit-slider-thumb {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  )
}
