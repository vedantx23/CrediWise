import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Cashback', value: 3500 },
  { name: 'Reward Points', value: 3000 },
  { name: 'Air Miles', value: 1600 },
];

const COLORS = ['#7c5cfc', '#00c9b1', '#a3e635']; // Purple, Cyan, Light Green

export default function RewardDistributionChart() {
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
              formatter={(value) => `₹${value.toLocaleString()}`}
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
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Rewards</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>₹8,100</div>
        </div>
      </div>
      {/* Custom Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        {data.map((item, idx) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx] }}></div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
