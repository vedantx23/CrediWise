import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SpendChart({ analytics }) {
  // Use real monthly totals from analytics
  const hasData = analytics?.monthlyTotals && analytics.monthlyTotals.length > 0;

  if (!hasData) {
    return (
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Monthly Spend
        </h3>
        <div style={{ 
          height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ fontSize: '36px', opacity: 0.3 }}>📈</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Log expenses to see<br/>your spending trends
          </div>
        </div>
      </div>
    );
  }

  // Format month labels (e.g. "2026-03" -> "Mar")
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = analytics.monthlyTotals.map(item => ({
    name: monthNames[parseInt(item.month.split('-')[1], 10) - 1] || item.month,
    Spending: item.total,
  }));

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
            <Bar dataKey="Spending" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: 'var(--accent-purple)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Spending</span>
        </div>
      </div>
    </div>
  );
}
