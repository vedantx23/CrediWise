import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Health & Medical', 'Utilities & Bills', 'Education', 'Other'];
const CARD_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316'];
const INSTRUMENT_TYPES = ['credit_card', 'debit_card', 'wallet', 'upi', 'other'];

const EMPTY_FORM = {
  name: '', type: 'credit_card', base_reward_rate: 1, redemption_value: 0.25,
  milestone_threshold: '', milestone_bonus: '', reward_cap: '',
  category_multipliers: [], color: '#6366f1'
};

export default function Instruments() {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchInstruments = useCallback(async () => {
    try {
      const res = await api.get('/instruments');
      setInstruments(res.data.instruments);
    } catch {
      toast.error('Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInstruments(); }, [fetchInstruments]);

  const toMultiplierArray = (obj) =>
    Object.entries(obj || {}).map(([category, multiplier]) => ({ category, multiplier }));

  const toMultiplierObj = (arr) =>
    arr.reduce((acc, { category, multiplier }) => {
      if (category && multiplier) acc[category] = Number(multiplier);
      return acc;
    }, {});

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (inst) => {
    setForm({
      name: inst.name,
      type: inst.type,
      base_reward_rate: inst.base_reward_rate,
      redemption_value: inst.redemption_value,
      milestone_threshold: inst.milestone_threshold || '',
      milestone_bonus: inst.milestone_bonus || '',
      reward_cap: inst.reward_cap || '',
      category_multipliers: toMultiplierArray(inst.category_multipliers),
      color: inst.color
    });
    setEditingId(inst.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      category_multipliers: toMultiplierObj(form.category_multipliers),
      milestone_threshold: form.milestone_threshold ? Number(form.milestone_threshold) : null,
      milestone_bonus: form.milestone_bonus ? Number(form.milestone_bonus) : 0,
      reward_cap: form.reward_cap ? Number(form.reward_cap) : null,
    };
    try {
      if (editingId) {
        await api.put(`/instruments/${editingId}`, payload);
        toast.success('Card updated');
      } else {
        await api.post('/instruments', payload);
        toast.success('Card added');
      }
      setShowModal(false);
      fetchInstruments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this card? Associated expenses will be unlinked.')) return;
    try {
      await api.delete(`/instruments/${id}`);
      toast.success('Card removed');
      fetchInstruments();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const addMultiplierRow = () => setForm(f => ({ ...f, category_multipliers: [...f.category_multipliers, { category: CATEGORIES[0], multiplier: 2 }] }));
  const removeMultiplierRow = (i) => setForm(f => ({ ...f, category_multipliers: f.category_multipliers.filter((_, idx) => idx !== i) }));
  const updateMultiplierRow = (i, field, value) =>
    setForm(f => ({ ...f, category_multipliers: f.category_multipliers.map((r, idx) => idx === i ? { ...r, [field]: value } : r) }));

  const typeLabel = (t) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cards & Wallets</h1>
          <p className="page-subtitle">{instruments.length} payment instrument{instruments.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Card</button>
      </div>

      {loading ? (
        <div className="instruments-grid">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 18 }} />)}
        </div>
      ) : instruments.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-icon">💳</div>
          <div className="empty-title">No cards added yet</div>
          <div className="empty-subtitle">Add your first credit card or wallet to start getting smart recommendations</div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Your First Card</button>
        </div>
      ) : (
        <div className="instruments-grid">
          {instruments.map(inst => {
            const multipliers = inst.category_multipliers || {};
            const hasMilestone = inst.milestone_threshold;
            return (
              <div key={inst.id} className="instrument-card" style={{ '--card-color': inst.color }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="instrument-name">{inst.name}</div>
                    <div className="instrument-type">{typeLabel(inst.type)}</div>
                  </div>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: inst.color, marginTop: 4 }} />
                </div>

                <div className="instrument-stats">
                  <div className="instrument-stat">
                    <div className="instrument-stat-label">Base Rate</div>
                    <div className="instrument-stat-value">{inst.base_reward_rate}%</div>
                  </div>
                  <div className="instrument-stat">
                    <div className="instrument-stat-label">Redemption</div>
                    <div className="instrument-stat-value">₹{inst.redemption_value}/pt</div>
                  </div>
                  {inst.reward_cap && (
                    <div className="instrument-stat">
                      <div className="instrument-stat-label">Reward Cap</div>
                      <div className="instrument-stat-value">{inst.reward_cap} pts</div>
                    </div>
                  )}
                  {hasMilestone && (
                    <div className="instrument-stat">
                      <div className="instrument-stat-label">Milestone</div>
                      <div className="instrument-stat-value">₹{inst.milestone_threshold}</div>
                    </div>
                  )}
                </div>

                {Object.keys(multipliers).length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(multipliers).map(([cat, mult]) => (
                      <span key={cat} className="badge badge-violet" style={{ fontSize: 10.5 }}>
                        {cat.split(' ')[0]} {mult}×
                      </span>
                    ))}
                  </div>
                )}

                {hasMilestone && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      🏆 Earn ₹{inst.milestone_bonus} bonus at ₹{inst.milestone_threshold} spend
                    </div>
                  </div>
                )}

                <div className="instrument-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inst)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inst.id)}>🗑 Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Card' : 'Add Payment Instrument'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Card / Wallet Name *</label>
                  <input className="form-input" placeholder="e.g. HDFC Regalia" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {INSTRUMENT_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Base Reward Rate (%)</label>
                  <input type="number" className="form-input" placeholder="1.0" min="0" step="0.01" value={form.base_reward_rate} onChange={e => setForm({ ...form, base_reward_rate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Redemption Value (₹ per point)</label>
                  <input type="number" className="form-input" placeholder="0.25" min="0.001" step="0.001" value={form.redemption_value} onChange={e => setForm({ ...form, redemption_value: e.target.value })} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                <div className="form-group">
                  <label className="form-label">Milestone Threshold (₹)</label>
                  <input type="number" className="form-input" placeholder="No milestone" min="0" value={form.milestone_threshold} onChange={e => setForm({ ...form, milestone_threshold: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Milestone Bonus (₹)</label>
                  <input type="number" className="form-input" placeholder="0" min="0" value={form.milestone_bonus} onChange={e => setForm({ ...form, milestone_bonus: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reward Cap (pts)</label>
                  <input type="number" className="form-input" placeholder="No cap" min="0" value={form.reward_cap} onChange={e => setForm({ ...form, reward_cap: e.target.value })} />
                </div>
              </div>

              {/* Color Picker */}
              <div className="form-group">
                <label className="form-label">Card Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CARD_COLORS.map(c => (
                    <div key={c} onClick={() => setForm({ ...form, color: c })} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid white' : '3px solid transparent',
                      transition: 'transform 0.1s', transform: form.color === c ? 'scale(1.2)' : 'scale(1)'
                    }} />
                  ))}
                </div>
              </div>

              {/* Category Multipliers */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Category Multipliers (optional)</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addMultiplierRow}>+ Add</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {form.category_multipliers.map((row, i) => (
                    <div key={i} className="multiplier-row">
                      <select className="form-select" value={row.category} onChange={e => updateMultiplierRow(i, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input type="number" className="form-input" placeholder="2" min="1" step="0.5" value={row.multiplier}
                        onChange={e => updateMultiplierRow(i, 'multiplier', e.target.value)} style={{ maxWidth: 80 }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>×</span>
                      <button type="button" className="btn-icon" onClick={() => removeMultiplierRow(i)} style={{ color: 'var(--accent-red)' }}>✕</button>
                    </div>
                  ))}
                  {form.category_multipliers.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No multipliers — this card earns at the base rate for all categories</div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update Card' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
