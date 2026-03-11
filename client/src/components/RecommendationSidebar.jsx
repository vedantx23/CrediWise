import { creditCardsData } from '../data/mockData';

export default function RecommendationSidebar({ userCards = [] }) {
  // Recommend cards the user doesn't already have, sorted by reward value
  const userCardNames = new Set(userCards.map(c => c.Card_Name));
  
  const recommendations = creditCardsData
    .filter(card => !userCardNames.has(card.Card_Name))
    .sort((a, b) => b.Reward_Value_Per_Point_INR - a.Reward_Value_Per_Point_INR)
    .slice(0, 3);

  const hasRecommendations = recommendations.length > 0;

  return (
    <div className="sidebar-right">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Card Recommendations</h2>
      </div>

      {!hasRecommendations ? (
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          padding: '40px 16px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', opacity: 0.3 }}>🎉</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            You've added all available cards!
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recommendations.map((card, idx) => {
            // Estimate yearly rewards: annual fee waiver threshold * reward rate
            const estimatedRewards = (card.Reward_Value_Per_Point_INR * 10000).toLocaleString();
            
            // Choose a description based on card properties
            let description = 'Good all-round card';
            if (card.Lounge_Access === 'Unlimited Global') description = 'Best for travel & lounges';
            else if (card.Reward_Type === 'Cashback') description = 'Best for cashback rewards';
            else if (card.Reward_Type === 'Air Miles') description = 'Best for travel rewards';
            else if (card.Reward_Value_Per_Point_INR >= 0.50) description = 'High reward value card';

            return (
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
                  background: idx === 0 ? 'var(--accent-purple)' : idx === 1 ? 'var(--accent-cyan)' : 'var(--accent-green)',
                  opacity: 0.15,
                  borderRadius: '50%',
                  filter: 'blur(12px)',
                  pointerEvents: 'none'
                }}></div>

                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {card.Card_Name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {description}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>₹/point value</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-purple)' }}>
                      ₹{card.Reward_Value_Per_Point_INR.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual fee</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {card.Annual_Fee_INR === 0 ? 'FREE' : `₹${card.Annual_Fee_INR.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
