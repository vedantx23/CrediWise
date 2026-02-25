import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  'Food & Dining': '#f59e0b',
  'Travel': '#06b6d4',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Health & Medical': '#10b981',
  'Utilities & Bills': '#6366f1',
  'Education': '#f97316',
  'Other': '#64748b'
};

const STAT_CARDS = (data) => [
  {
    icon: '₹', label: 'Spent This Month',
    value: `₹${(data?.monthTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
    sub: 'Current month',
    color: 'var(--accent-blue)'
  },
  {
    icon: '🏆', label: 'Total Rewards Earned',
    value: `₹${(data?.totalRewardsValue || 0).toFixed(2)}`,
    sub: 'This month',
    color: 'var(--accent-green)'
  },
  {
    icon: '💳', label: 'Active Cards',
    value: data?.instrumentCount || 0,
    sub: 'Payment instruments',
    color: 'var(--accent-violet)'
  },
  {
    icon: '📊', label: 'All-Time Total',
    value: `₹${(data?.allTimeTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
    sub: 'Since you joined',
    color: 'var(--accent-orange)'
  }
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px' }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>₹{Number(payload[0].value).toLocaleString('en-IN')}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/analytics/summary');
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="page-body">
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ width: 180, height: 24, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 120, height: 14 }} />
          </div>
        </div>
        <div className="stat-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 18 }} />)}
        </div>
      </div>
    );
  }

  const stats = STAT_CARDS(data);
  const monthlyData = (data?.monthlyTotals || []).map(m => ({
    month: m.month?.substring(5),
    total: parseFloat(m.total?.toFixed(0))
  }));
  const categoryData = (data?.categoryBreakdown || []).map(c => ({
    name: c.category,
    value: parseFloat(c.total?.toFixed(2))
  }));
  const recentExpenses = data?.recentExpenses || [];
  const instrumentSummaries = data?.instrumentSummaries || [];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your financial overview at a glance</p>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ '--accent-color': s.color }}>
            <span className="stat-icon">{s.icon}</span>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Monthly Spending (Last 6 Months)</div>
          {monthlyData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-subtitle">No spending data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={32}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" fill="url(#blueGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">Category Breakdown</div>
          {categoryData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon">🥧</div>
              <div className="empty-subtitle">No expenses this month</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={CATEGORY_COLORS[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`₹${v}`, '']} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-md)' }}>
        {/* Recent Expenses */}
        <div className="card">
          <div className="chart-title" style={{ marginBottom: 'var(--space-md)' }}>Recent Expenses</div>
          {recentExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💸</div>
              <div className="empty-subtitle">No expenses yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentExpenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[exp.category] || '#64748b', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{exp.category}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{exp.date} • {exp.instrument_name || 'Cash'}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: 14 }}>−₹{exp.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestone Progress */}
        <div className="card">
          <div className="chart-title" style={{ marginBottom: 'var(--space-md)' }}>Milestone Progress</div>
          {instrumentSummaries.filter(s => s.milestoneThreshold).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <div className="empty-subtitle">No milestone cards configured</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {instrumentSummaries.filter(s => s.milestoneThreshold).map(inst => (
                <div key={inst.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: inst.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{inst.name}</span>
                    </div>
                    <span className="badge badge-blue">🏆 ₹{inst.milestoneBonus} bonus</span>
                  </div>
                  <div className="milestone-bar">
                    <div className="milestone-bar-fill" style={{ width: `${inst.milestoneProgress || 0}%` }} />
                  </div>
                  <div className="milestone-label">
                    <span>₹{inst.totalSpend.toLocaleString('en-IN')}</span>
                    <span>{(inst.milestoneProgress || 0).toFixed(0)}%</span>
                    <span>₹{inst.milestoneThreshold?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
