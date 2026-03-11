import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['var(--accent-purple)', 'var(--border)'];

export default function CardPerformanceGauge({ analytics, userCards }) {
  const hasCards = userCards && userCards.length > 0;

  // Calculate a performance score based on actual card data
  let score = 0;
  let maxScore = 5;

  if (hasCards) {
    // Score factors (each out of 1):
    // 1. Average reward value (higher is better, max ~1.0 = 1 point)
    const avgRewardVal = userCards.reduce((s, c) => s + (c.Reward_Value_Per_Point_INR || 0), 0) / userCards.length;
    const rewardScore = Math.min(avgRewardVal / 1.0, 1);

    // 2. Lounge access coverage (% of cards with lounge access)
    const loungeCount = userCards.filter(c => 
      c.Lounge_Access && (c.Lounge_Access.startsWith('Yes') || c.Lounge_Access.startsWith('Unlimited'))
    ).length;
    const loungeScore = loungeCount / userCards.length;

    // 3. International usage coverage
    const intlCount = userCards.filter(c => 
      c.International_Usage && c.International_Usage.startsWith('Yes')
    ).length;
    const intlScore = intlCount / userCards.length;

    // 4. Fee waiver availability
    const waiverCount = userCards.filter(c => 
      c.Spend_Based_Fee_Waiver && c.Spend_Based_Fee_Waiver !== 'No Waiver' && c.Spend_Based_Fee_Waiver !== 'N/A'
    ).length;
    const waiverScore = waiverCount / userCards.length;

    // 5. Diversity of reward types
    const uniqueTypes = new Set(userCards.map(c => c.Reward_Type)).size;
    const diversityScore = Math.min(uniqueTypes / 3, 1); // 3+ types = perfect

    score = ((rewardScore + loungeScore + intlScore + waiverScore + diversityScore) / 5) * maxScore;
    score = Math.round(score * 10) / 10; // 1 decimal place
  }

  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: maxScore - score },
  ];

  if (!hasCards) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '8px', color: 'var(--text-primary)' }}>
          Card Performance
        </h3>
        <div style={{ 
          height: '180px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px', marginTop: '20px'
        }}>
          <div style={{ fontSize: '36px', opacity: 0.3 }}>⚡</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Add cards to see<br/>your performance score
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '8px', color: 'var(--text-primary)' }}>
        Card Performance
      </h3>
      
      <div style={{ height: '180px', width: '100%', position: 'relative', marginTop: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={100}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={10}
            >
              <Cell fill={COLORS[0]} />
              <Cell fill={COLORS[1]} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text for Semi-circle */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translate(-50%, 0)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Card Portfolio Score</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '4px' }}>
            {score} <span style={{fontSize: '16px', color: 'var(--text-muted)'}}>/ 5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
