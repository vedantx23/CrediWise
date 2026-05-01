import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { BrainCircuit, Search, Zap, Trophy, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Food & Dining', 'Travel', 'Shopping', 'Entertainment', 'Health & Medical', 'Utilities & Bills', 'Education', 'Other'];

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
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold gold-gradient-text tracking-tighter uppercase flex items-center gap-3">
            <BrainCircuit className="text-[#d4af37]" /> SMART_RECOMMEND
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-1 uppercase tracking-widest">REAL_TIME_TRANSACTION_OPTIMIZER</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-[#111] border border-[#d4af37]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.05)]">
        <h3 className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-8 border-b border-gray-800 pb-4">TRANSACTION_PARAMETERS</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">AMOUNT (₹)</label>
            <input
              type="number"
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] transition-all"
              placeholder="e.g. 2500"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">CATEGORY</label>
            <select 
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] transition-all appearance-none" 
              value={form.category} 
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            className="bg-[#d4af37] text-black px-8 py-3 rounded-xl font-bold hover:bg-[#b38728] transition-all flex items-center justify-center gap-2 h-[50px] shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-[0.98]" 
            disabled={loading}
          >
            {loading ? <Zap className="animate-spin" /> : <Search size={18} />} 
            {loading ? 'ANALYZING...' : 'GET_BEST_CARD'}
          </button>
        </form>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {results.recommendations.length === 0 ? (
            <div className="bg-[#111] border border-gray-800 rounded-3xl p-12 text-center">
              <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-400">NO_COMPATIBLE_INSTRUMENTS</h2>
              <p className="text-gray-600 mt-2">Initialize cards in THE VAULT to receive optimization intelligence.</p>
            </div>
          ) : (
            <>
              {/* Winner Banner */}
              <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-[#d4af37]/50 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-[#d4af37]/5 group-hover:text-[#d4af37]/10 transition-colors">
                  <Trophy size={160} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="h-20 w-20 bg-[#d4af37] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                    <Trophy size={40} className="text-black" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-[10px] font-mono text-[#d4af37] tracking-[0.3em] mb-2 uppercase">OPTIMAL_SELECTION_DETECTED</p>
                    <h2 className="text-3xl font-bold text-white mb-2">{bestCard?.instrument?.name}</h2>
                    <p className="text-green-500 font-bold flex items-center justify-center md:justify-start gap-2">
                      <Zap size={16} /> EARNS ₹{bestCard?.monetaryValue} IN REWARDS
                    </p>
                  </div>
                </div>
              </div>

              {/* Ranking List */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-mono text-gray-600 tracking-[0.4em] uppercase ml-4">STACK_RANKING</h3>
                {results.recommendations.map((rec, idx) => (
                  <div 
                    key={rec.instrument.id} 
                    className={`bg-[#111] border ${rec.isBest ? 'border-[#d4af37]/30' : 'border-gray-800'} rounded-2xl p-6 transition-all hover:bg-[#161616]`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full font-mono text-xs font-bold border ${rec.isBest ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-transparent text-gray-600 border-gray-800'}`}>
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-bold text-white">{rec.instrument.name}</h4>
                          {rec.isBest && <span className="bg-[#d4af37]/10 text-[#d4af37] text-[9px] px-2 py-0.5 rounded border border-[#d4af37]/20 font-mono tracking-widest uppercase">OPTIMAL</span>}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">
                          {rec.rawRewards} UNITS × ₹{rec.instrument.redemption_value} VALUE_PER_UNIT
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-gray-600 font-mono mb-1 uppercase">EST_VALUE</p>
                        <p className="text-xl font-bold text-white">₹{rec.monetaryValue}</p>
                      </div>

                      <button 
                        onClick={() => toggleExpand(rec.instrument.id)}
                        className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
                      >
                        {expanded[rec.instrument.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>

                    {expanded[rec.instrument.id] && (
                      <div className="mt-6 pt-6 border-t border-gray-800/50 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[10px] font-mono text-gray-500 tracking-widest uppercase mb-4">CALCULATION_LOG:</p>
                        {rec.explanation.steps.map((step, si) => (
                          <div key={si} className="flex justify-between items-center text-xs">
                             <span className="text-gray-500 font-mono uppercase tracking-tighter">{step.label.replace(' ', '_')}</span>
                             <div className="flex-1 border-b border-dotted border-gray-800 mx-4 h-1" />
                             <span className={step.label.includes('Total') ? 'text-green-500 font-bold' : 'text-gray-300'}>{step.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
