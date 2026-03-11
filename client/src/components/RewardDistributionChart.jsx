import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#7c5cfc', '#00c9b1', '#a3e635', '#f59e0b', '#ef4444'];

export default function RewardDistributionChart({ analytics, userCards }) {
  // Build data from user's actual cards by reward type
  const hasCards = userCards && userCards.length > 0;

  let data = [];
  if (hasCards) {
    // Group user cards by Reward_Type and count them
    const typeMap = {};
    userCards.forEach(card => {
      const type = card.Reward_Type || 'Other';
      if (!typeMap[type]) {
        typeMap[type] = 0;
      }
      typeMap[type] += 1;
    });
    data = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  }

  // If analytics has instrument summaries with reward data, use monetary values instead
  if (analytics?.instrumentSummaries && analytics.instrumentSummaries.length > 0) {
    const summaries = analytics.instrumentSummaries.filter(s => s.monthlyRewards > 0);
    if (summaries.length > 0) {
      data = summaries.map(s => ({ name: s.name, value: s.monthlyRewards }));
    }
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hasData = data.length > 0 && total > 0;
  const isMonetary = analytics?.instrumentSummaries?.some(s => s.monthlyRewards > 0);

  if (!hasData && !hasCards) {
    return (
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Reward Distribution
        </h3>
        <div style={{ 
          height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ fontSize: '36px', opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Add cards and log expenses<br/>to see reward distribution
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Reward Distribution
      </h3>
      <div style={{ height: '220px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => isMonetary ? `₹${value.toLocaleString()}` : `${value} card${value > 1 ? 's' : ''}`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {isMonetary ? 'Total Rewards' : 'Total Cards'}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {isMonetary ? `₹${total.toLocaleString()}` : total}
          </div>
        </div>
      </div>
      {/* Custom Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
        {data.map((item, idx) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }}></div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
