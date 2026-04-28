export default function VaultCard({
  children,
  className = '',
  active = false,
  style = {},
  ...props
}) {
  return (
    <div
      className={`vault-card ${active ? 'vault-card--active' : ''} ${className}`}
      style={style}
      {...props}
    >
      {/* Corner accents */}
      <span className="corner corner-tl" aria-hidden="true" />
      <span className="corner corner-tr" aria-hidden="true" />
      <span className="corner corner-bl" aria-hidden="true" />
      <span className="corner corner-br" aria-hidden="true" />

      {/* Shimmer top line */}
      <span className="shimmer-line" aria-hidden="true" />

      {children}

      <style>{`
        .vault-card {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid rgba(212,175,55,0.08);
          border-radius: var(--radius-lg);
          padding: 28px;
          overflow: hidden;
          transition:
            border-color var(--dur-mid) var(--ease-vault),
            box-shadow   var(--dur-mid) var(--ease-vault),
            transform    var(--dur-mid) var(--ease-vault);
        }
        .vault-card:hover {
          border-color: rgba(212,175,55,0.25);
          box-shadow:
            0 0 40px rgba(212,175,55,0.06),
            0 0 80px rgba(212,175,55,0.03);
          transform: translateY(-2px);
        }
        .vault-card--active {
          box-shadow: inset 0 0 60px rgba(212,175,55,0.04);
        }

        /* ── Shimmer top line ── */
        .shimmer-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--gold-bright) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-position: -200% center;
          opacity: 0;
          transition: opacity var(--dur-mid);
        }
        .vault-card:hover .shimmer-line {
          opacity: 1;
          animation: shimmer-sweep 1.2s ease forwards;
        }

        /* ── Corner L-brackets ── */
        .corner {
          position: absolute;
          width: 16px; height: 16px;
          pointer-events: none;
        }
        .corner-tl { top: 8px;    left: 8px;    border-top: 1px solid var(--gold-dim); border-left:  1px solid var(--gold-dim); }
        .corner-tr { top: 8px;    right: 8px;   border-top: 1px solid var(--gold-dim); border-right: 1px solid var(--gold-dim); }
        .corner-bl { bottom: 8px; left: 8px;    border-bottom: 1px solid var(--gold-dim); border-left:  1px solid var(--gold-dim); }
        .corner-br { bottom: 8px; right: 8px;   border-bottom: 1px solid var(--gold-dim); border-right: 1px solid var(--gold-dim); }
      `}</style>
    </div>
  )
}
