import { creditCardsData } from '../data/mockData';

export default function RecommendationSidebar() {
  // Grab the top 3 cards for recommendations mock
  const topCards = creditCardsData.slice(4, 7); // Axis Magnus, Atlas, Select

  return (
    <div className="sidebar-right">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Card Recommendations</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {topCards.map((card, idx) => (
          <div
            key={card.Card_Name}
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Card Background gradient blur detail */}
            <div style={{
              position: 'absolute',
              top: '-20px', right: '-20px',
              width: '80px', height: '80px',
              background: idx === 0 ? 'var(--accent-purple)' : 'var(--accent-cyan)',
              opacity: 0.15,
              borderRadius: '50%',
              filter: 'blur(12px)',
              pointerEvents: 'none'
            }}></div>

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {card.Card_Name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {idx === 1 ? 'Best for travel rewards' : 'Best for premium lifestyle'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. yearly rewards</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-purple)' }}>₹{idx === 1 ? '3,200' : '8,500'}</div>
              </div>
              <button style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}>
                View More
              </button>
            </div>
          </div>
        ))}
      </div>

      <button style={{
        width: '100%',
        marginTop: '24px',
        padding: '12px',
        background: 'var(--gradient-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(124, 92, 252, 0.25)',
        cursor: 'pointer'
      }}>
        Find Best Card
      </button>
    </div>
  );
}
