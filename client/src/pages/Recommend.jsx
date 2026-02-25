import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Health & Medical', 'Utilities & Bills', 'Education', 'Other'];

const CATEGORY_ICONS = {
  'Food & Dining': '🍔', 'Travel': '✈️', 'Shopping': '🛍️',
  'Entertainment': '🎬', 'Health & Medical': '💊', 'Utilities & Bills': '⚡',
  'Education': '📚', 'Other': '📦'
};

export default function Recommend() {
  const [form, setForm] = useState({ amount: '', category: 'Food & Dining' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await api.post('/recommend', { amount: Number(form.amount), category: form.category });
      setResults(res.data);
      if (res.data.recommendations?.length === 0) {
        toast('Add some payment cards first!', { icon: '💳' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recommendation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const bestCard = results?.recommendations?.[0];

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧠 Smart Recommend</h1>
          <p className="page-subtitle">Find the best card for your next transaction</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="card" style={{ maxWidth: 500, marginBottom: 'var(--space-xl)' }}>
        <div className="chart-title" style={{ marginBottom: 'var(--space-lg)' }}>Enter Transaction Details</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 2500"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
            {loading ? '⏳ Calculating...' : '🔍 Get Recommendation'}
          </button>
        </form>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)}
        </div>
      )}

      {results && !loading && (
        <>
          {results.recommendations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <div className="empty-title">No payment instruments found</div>
              <div className="empty-subtitle">Head to Cards & Wallets to add your first payment card</div>
            </div>
          ) : (
            <>
              {/* Summary Banner */}
              <div className="card card-gradient" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                <div style={{ fontSize: 40 }}>🏆</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>BEST CARD FOR ₹{Number(form.amount).toLocaleString('en-IN')} on {form.category}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{bestCard?.instrument?.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--accent-green)', fontWeight: 600 }}>
                    Saves you ₹{bestCard?.monetaryValue} in rewards
                    {bestCard?.milestoneTriggered && ' 🎉 + milestone bonus!'}
                  </div>
                </div>
              </div>

              {/* Cards Ranked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {results.recommendations.map((rec, idx) => (
                  <div key={rec.instrument.id} className={`rec-card ${rec.isBest ? 'best' : ''}`}>
                    <div className={`rec-rank ${rec.isBest ? 'best' : ''}`}>#{idx + 1}</div>

                    <div className="rec-header">
                      <div className="rec-card-dot" style={{ background: rec.instrument.color }} />
                      <div className="rec-card-name">{rec.instrument.name}</div>
                      {rec.isBest && <span className="badge badge-green">🏆 Best Choice</span>}
                      {rec.milestoneTriggered && <span className="badge badge-orange">🎉 Milestone!</span>}
                      {rec.capApplied && <span className="badge badge-red" style={{ fontSize: 10.5 }}>⚠️ Capped</span>}
                    </div>

                    <div className="rec-value">₹{rec.monetaryValue}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                      {rec.rawRewards} pts × ₹{rec.instrument.redemption_value}/pt
                      {rec.categoryMultiplier > 1 && ` • ${rec.categoryMultiplier}× ${form.category} bonus`}
                      {rec.milestoneBonus > 0 && ` • +₹${rec.milestoneBonus} milestone bonus`}
                    </div>

                    {/* Milestone progress for this rec */}
                    {rec.milestoneProgress && (
                      <div className="milestone-bar-container" style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="milestone-label">
                          <span>₹{rec.milestoneProgress.currentSpend} spend</span>
                          <span>Milestone at ₹{rec.milestoneProgress.threshold}</span>
                        </div>
                        <div className="milestone-bar">
                          <div className="milestone-bar-fill" style={{ width: `${rec.milestoneProgress.percentAfter}%` }} />
                        </div>
                        {rec.milestoneTriggered && (
                          <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 4 }}>
                            ✅ This purchase completes your milestone!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Explanation toggle */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleExpand(rec.instrument.id)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {expanded[rec.instrument.id] ? '▲ Hide Breakdown' : '▼ See Breakdown'}
                    </button>

                    {expanded[rec.instrument.id] && (
                      <div className="rec-breakdown">
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>How we calculated this</div>
                        {rec.explanation.steps.map((step, si) => (
                          <div key={si} className="breakdown-row">
                            <div className="breakdown-label">{step.label}</div>
                            <div className="breakdown-detail" style={{ textAlign: 'left', paddingLeft: 8, color: 'var(--text-muted)' }}>{step.detail}</div>
                            <div className="breakdown-value" style={{ color: step.label.includes('Total') ? 'var(--accent-green)' : step.label.includes('Milestone') ? 'var(--accent-orange)' : 'var(--text-primary)' }}>
                              {step.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
