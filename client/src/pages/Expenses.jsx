import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Health & Medical', 'Utilities & Bills', 'Education', 'Other'];

const CATEGORY_COLORS = {
  'Food & Dining': '#f59e0b', 'Travel': '#06b6d4', 'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6', 'Health & Medical': '#10b981',
  'Utilities & Bills': '#6366f1', 'Education': '#f97316', 'Other': '#64748b'
};

const EMPTY_FORM = { date: new Date().toISOString().split('T')[0], amount: '', category: 'Food & Dining', payment_instrument_id: '', note: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  const fetchAll = useCallback(async () => {
    try {
      const [expRes, instRes] = await Promise.all([
        api.get('/expenses', { params: { month: filterMonth || undefined, category: filterCat !== 'All' ? filterCat : undefined } }),
        api.get('/instruments')
      ]);
      setExpenses(expRes.data.expenses);
      setInstruments(instRes.data.instruments);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterCat]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = (e) => {
    setForm({ date: e.date, amount: e.amount, category: e.category, payment_instrument_id: e.payment_instrument_id || '', note: e.note || '' });
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, form);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense added');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalShown = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{expenses.length} records • ₹{totalShown.toLocaleString('en-IN', { minimumFractionDigits: 2 })} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="month"
          className="form-input"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ width: 'auto' }}
        />
        <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto' }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        {(filterMonth || filterCat !== 'All') && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterMonth(''); setFilterCat('All'); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th>Card Used</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-subtitle">Loading...</div></div></td></tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-icon">💸</div>
                    <div className="empty-title">No expenses found</div>
                    <div className="empty-subtitle">Add your first expense to get started</div>
                  </div>
                </td>
              </tr>
            ) : expenses.map(exp => (
              <tr key={exp.id}>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{exp.date}</td>
                <td>
                  <span className="badge" style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] }}>
                    {exp.category}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exp.note || '—'}
                </td>
                <td>
                  {exp.instrument_name ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: exp.instrument_color, display: 'inline-block' }} />
                      {exp.instrument_name}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>Cash</span>}
                </td>
                <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>−₹{exp.amount.toLocaleString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-icon" onClick={() => openEdit(exp)} title="Edit">✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(exp.id)} title="Delete" style={{ color: 'var(--accent-red)' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-input" placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Card (optional)</label>
                <select className="form-select" value={form.payment_instrument_id} onChange={e => setForm({ ...form, payment_instrument_id: e.target.value })}>
                  <option value="">Cash / Untracked</option>
                  {instruments.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Note (optional — used for auto-categorization)</label>
                <input type="text" className="form-input" placeholder="e.g. Swiggy order, Uber ride..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
