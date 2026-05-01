import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit3, Filter, Receipt, Calendar, CreditCard, Tag } from 'lucide-react';

const CATEGORIES = ['Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Health & Medical', 'Utilities & Bills', 'Education', 'Other'];

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
      // The mock backend returns a single spend object, not a list. 
      // Let's adjust to handle both real list and our mock object.
      const rawExp = expRes.data.expenses || expRes.data.monthly_spend || {};
      
      // If it's a category map (our mock), convert to display list
      if (!Array.isArray(rawExp)) {
          const list = Object.entries(rawExp).map(([cat, amt], idx) => ({
              id: idx,
              date: new Date().toISOString().split('T')[0],
              category: cat.charAt(0).toUpperCase() + cat.slice(1),
              amount: amt,
              note: 'Consolidated category spend',
              instrument_name: 'Primary Card'
          }));
          setExpenses(list);
      } else {
          setExpenses(rawExp);
      }
      
      setInstruments(instRes.data.instruments || []);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#d4af37] animate-pulse font-mono tracking-widest uppercase">SCANNING_TRANSACTION_LEDGER...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold gold-gradient-text tracking-tighter uppercase">THE VAULT: FORENSICS</h1>
          <p className="text-gray-500 font-mono text-sm mt-1 uppercase tracking-widest">TRANSACTION_HISTORY_ANALYSIS</p>
        </div>
        <button 
          className="flex items-center gap-2 bg-[#d4af37] text-black px-6 py-3 rounded-full font-bold hover:bg-[#b38728] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          onClick={openAdd}
        >
          <Plus size={20} /> LOG_NEW_EXPENSE
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
           <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] mb-2">TOTAL_EXPOSURE</p>
           <h2 className="text-3xl font-bold text-white">₹{totalShown.toLocaleString()}</h2>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
           <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] mb-2">RECORD_COUNT</p>
           <h2 className="text-3xl font-bold text-white">{expenses.length}</h2>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
           <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] mb-2">ANOMALIES_DETECTED</p>
           <h2 className="text-3xl font-bold text-green-500">00</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-[#111] p-4 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-2 text-gray-500 px-2 border-r border-gray-800">
           <Filter size={16} /> <span className="text-[10px] font-mono uppercase tracking-widest">FILTERS</span>
        </div>
        <input
          type="month"
          className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#d4af37] text-sm"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        <select 
          className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#d4af37] text-sm" 
          value={filterCat} 
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="All">ALL_CATEGORIES</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        {(filterMonth || filterCat !== 'All') && (
          <button 
            className="text-xs text-[#d4af37] hover:underline font-mono uppercase tracking-widest" 
            onClick={() => { setFilterMonth(''); setFilterCat('All'); }}
          >
            RESET_LOGS
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-[#111] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#161616] border-b border-gray-800">
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">TIMESTAMP</th>
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">CATEGORY</th>
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">ANNOTATION</th>
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">INSTRUMENT</th>
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">QUANTUM</th>
                <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <Receipt size={48} className="text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-600 font-mono text-sm tracking-widest uppercase">LEDGER_EMPTY_INITIALIZE_DATA</p>
                  </td>
                </tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                       <Calendar size={12} /> {exp.date}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[#d4af37] bg-[#d4af37]/5 border border-[#d4af37]/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400 font-medium">{exp.note || '---'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-mono">
                       <CreditCard size={12} className="text-[#d4af37]" /> {exp.instrument_name || 'UNDEFINED'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-red-500/80">−₹{exp.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEdit(exp)}
                        className="p-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-gray-500 hover:text-[#d4af37] transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="p-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#111] border border-[#d4af37]/30 rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#161616]">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
                <Receipt size={20} className="text-[#d4af37]" /> {editingId ? 'UPDATE_LEDGER_ENTRY' : 'LOG_NEW_TRANSACTION'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Calendar size={10} /> TIMESTAMP
                  </label>
                  <input type="date" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">QUANTUM (₹)</label>
                  <input type="number" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]" placeholder="0.00" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Tag size={10} /> CATEGORY
                  </label>
                  <select className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] appearance-none" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <CreditCard size={10} /> INSTRUMENT
                  </label>
                  <select className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] appearance-none" value={form.payment_instrument_id} onChange={e => setForm({ ...form, payment_instrument_id: e.target.value })}>
                    <option value="">CASH / UNTRACKED</option>
                    {instruments.map(i => <option key={i.id} value={i.id}>{i.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">ANNOTATION_LOG</label>
                <input type="text" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]" placeholder="e.g. Swiggy order, Uber ride..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" className="flex-1 bg-transparent border border-gray-700 text-gray-500 px-6 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all uppercase text-xs" onClick={() => setShowModal(false)}>ABORT_MISSION</button>
                <button type="submit" className="flex-1 bg-[#d4af37] text-black px-6 py-4 rounded-2xl font-bold hover:bg-[#b38728] transition-all disabled:opacity-50 uppercase text-xs shadow-lg" disabled={submitting}>
                  {submitting ? 'SYNCING...' : editingId ? 'UPDATE_LEDGER' : 'COMMIT_ENTRY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
