import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Week 1', Spending: 12000, Rewards: 150 },
  { name: 'Week 2', Spending: 18000, Rewards: 250 },
  { name: 'Week 3', Spending: 8500, Rewards: 80 },
  { name: 'Week 4', Spending: 24000, Rewards: 450 },
];

export default function SpendChart() {
  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Monthly Spend
      </h3>
      <div style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip
              cursor={{ fill: 'var(--bg-card-hover)' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
              formatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Bar dataKey="Spending" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} barSize={12} />
            <Bar dataKey="Rewards" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-purple)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spending</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-cyan)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Rewards Earned</span>
        </div>
      </div>
    </div>
  );
}
