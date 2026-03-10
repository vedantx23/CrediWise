import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Score', value: 4.3 },
  { name: 'Remaining', value: 0.7 },
];

const COLORS = ['var(--accent-purple)', 'var(--border)'];

export default function CardPerformanceGauge() {
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
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Average Card Score</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '4px' }}>4.3 <span style={{fontSize: '16px', color: 'var(--text-muted)'}}>/ 5</span></div>
        </div>
      </div>
    </div>
  );
}
