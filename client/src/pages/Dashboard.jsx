import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import api from '../api';
import { LayoutDashboard, TrendingUp, Wallet, ShieldCheck, Activity, Zap } from 'lucide-react';
import SpendDial from '../components/SpendDial';

export default function Dashboard() {
  const { user } = useAuth();
  const { userCards, loading: cardsLoading } = useCardContext();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [demoSpend, setDemoSpend] = useState(25000);

  const firstName = user?.name ? user.name.split(' ')[0] : 'AGENT';

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await api.get('/analytics/summary');
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const cardCount = userCards.length;
  const monthTotal = analytics?.monthTotal ?? 0;
  const totalRewards = analytics?.totalRewardsValue ?? 0;
  
  const avgRewardValue = userCards.length > 0
    ? (userCards.reduce((sum, c) => sum + (c.Reward_Value_Per_Point_INR || 0), 0) / userCards.length).toFixed(2)
    : '0.00';

  const demoRate = demoSpend > 30000 ? 3.5 : demoSpend > 10000 ? 2.0 : 1.2;

  if (cardsLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#d4af37] animate-pulse font-mono tracking-[0.3em] text-sm">
          SYNCHRONIZING_BIOMETRIC_DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 bg-[#d4af37] rounded-full animate-ping" />
            <span className="text-[10px] font-mono text-[#d4af37] tracking-[0.4em] uppercase">SYSTEM_ONLINE</span>
          </div>
          <h1 className="text-4xl font-bold gold-gradient-text tracking-tighter uppercase">
            WELCOME_BACK, {firstName}
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-1 uppercase tracking-widest">CREDIT_OPTIMIZATION_PORTAL_V2.0</p>
        </div>
        
        <div className="flex gap-4 bg-[#111] p-2 rounded-xl border border-gray-800">
           <div className="px-4 py-2 text-center">
              <p className="text-[9px] text-gray-600 font-mono">CIBIL_SCORE</p>
              <p className="text-sm font-bold text-green-500">782</p>
           </div>
           <div className="w-[1px] bg-gray-800" />
           <div className="px-4 py-2 text-center">
              <p className="text-[9px] text-gray-600 font-mono">VAULT_LEVEL</p>
              <p className="text-sm font-bold text-[#d4af37]">PLATINUM</p>
           </div>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main Metrics */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-gray-800/10 group-hover:text-[#d4af37]/5 transition-colors">
              <Wallet size={120} />
            </div>
            <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] mb-4">TOTAL_ANNUAL_LEAKAGE_RESCUED</p>
            <h2 className="text-5xl font-bold text-white mb-2">₹{totalRewards.toLocaleString()}</h2>
            <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
              <TrendingUp size={14} /> +12.5% FROM LAST_MONTH
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-gray-800/10 group-hover:text-[#d4af37]/5 transition-colors">
              <ShieldCheck size={120} />
            </div>
            <p className="text-[10px] font-mono text-gray-500 tracking-[0.2em] mb-4">ACTIVE_INSTRUMENTS</p>
            <h2 className="text-5xl font-bold text-white mb-2">{cardCount}</h2>
            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Average Reward Value: ₹{avgRewardValue}</p>
          </div>

          <div className="md:col-span-2 bg-[#111] border border-gray-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-bold text-[#d4af37] tracking-widest uppercase">LIVE_OPTIMIZATION_DIAL</h3>
               <Zap size={20} className="text-[#d4af37]" />
            </div>
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6 w-full">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">SIMULATED_MONTHLY_SPEND: ₹{demoSpend.toLocaleString()}</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100000" 
                    value={demoSpend} 
                    onChange={(e) => setDemoSpend(Number(e.target.value))}
                    className="w-full accent-[#d4af37] bg-gray-800 rounded-lg h-1 appearance-none cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-2xl">
                    <p className="text-[9px] text-gray-600 font-mono mb-1">EFFICIENCY_SCORE</p>
                    <p className="text-lg font-bold text-white">{demoRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-2xl">
                    <p className="text-[9px] text-gray-600 font-mono mb-1">ESTIMATED_MONTH_VALUE</p>
                    <p className="text-lg font-bold text-white">₹{(demoSpend * demoRate / 100).toFixed(0)}</p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <SpendDial spend={demoSpend} maxSpend={100000} rate={demoRate} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity Log / Feed */}
        <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 h-full flex flex-col">
           <div className="flex items-center gap-2 mb-8 border-b border-gray-800 pb-4">
              <Activity size={18} className="text-[#d4af37]" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">SECURITY_FEED</h3>
           </div>
           <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              {[
                { time: '12:45', action: 'DOWNGRADE_ALERT', desc: 'HDFC Millennia rates dropped 0.2%' },
                { time: '10:20', action: 'INSTRUMENT_ADDED', desc: 'Axis Ace initialized successfully' },
                { time: '09:15', action: 'REWARD_SYNC', desc: 'Fetched 1,240 points from ICICI' },
                { time: 'Yesterday', action: 'AUDIT_COMPLETE', desc: 'Calculated leakages for Region_5' },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                   <div className="text-[9px] font-mono text-gray-600 pt-1">{item.time}</div>
                   <div>
                      <p className="text-[10px] font-bold text-[#d4af37] tracking-widest">{item.action}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                   </div>
                </div>
              ))}
           </div>
           <button className="w-full mt-8 bg-[#1a1a1a] border border-gray-800 text-gray-400 py-3 rounded-xl font-mono text-[10px] tracking-[0.2em] hover:bg-gray-800 transition-colors uppercase">
              DOWNLOAD_ENCRYPTED_LOGS
           </button>
        </div>
      </div>

      {/* Performance Footer */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
            <Zap size={24} className="text-green-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">REWARD_ARBITRAGE_ACTIVE</p>
            <p className="text-[10px] text-gray-500 font-mono">Routing travel spend to HDFC Infinia for 3.3% gain</p>
          </div>
        </div>
        <button className="bg-[#d4af37] text-black px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg">
          VIEW_FULL_AUDIT_REPORT
        </button>
      </div>
    </div>
  );
}
