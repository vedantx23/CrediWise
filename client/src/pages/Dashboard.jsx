import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import api from '../api';
import { 
  LayoutDashboard, TrendingUp, Wallet, ShieldCheck, 
  Activity, Zap, PieChart as PieIcon, BarChart3, 
  ArrowUpRight, CreditCard, Landmark, Hexagon,
  Target, Info, ChevronRight, Cpu, ZapOff, Fingerprint,
  Globe, Shield
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const COLORS = ['#d4af37', '#c0c0c0', '#b08d57', '#8e8e8e', '#5a5a5a', '#e5e4e2'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111] border border-[#d4af37]/30 p-3 rounded-lg shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold text-white">
          {typeof payload[0].value === 'number' ? `₹${payload[0].value.toLocaleString()}` : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { userCards, loading: cardsLoading } = useCardContext();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

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

  // Logic for Category Routing (Best Card for each category)
  const categoryRouting = useMemo(() => {
    if (!userCards || userCards.length === 0) return [];

    const categories = ['online', 'travel', 'dining', 'grocery', 'fuel', 'utilities'];
    return categories.map(cat => {
      let best = userCards[0];
      let maxRate = 0;

      userCards.forEach(card => {
        const multipliers = card.category_multipliers || {};
        const mult = (multipliers instanceof Map) ? (multipliers.get(cat) || 1) : (multipliers[cat] || 1);
        const rate = (Number(card.base_reward_rate) || 0) * (Number(mult) || 1);
        if (rate > maxRate) {
          maxRate = rate;
          best = card;
        }
      });

      return { category: cat, bestCard: best.name, rate: maxRate.toFixed(1) };
    });
  }, [userCards]);

  if (cardsLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Hexagon className="text-[#d4af37] animate-spin h-16 w-16 opacity-20" />
            <Hexagon className="text-[#d4af37] animate-pulse h-16 w-16 absolute inset-0" />
          </div>
          <div className="text-[#d4af37] animate-pulse font-mono tracking-[0.4em] text-[10px] uppercase">
            SYNCHRONIZING_VAULT_ASSETS...
          </div>
        </div>
      </div>
    );
  }

  const { 
    monthTotal = 0, 
    totalRewardsValue = 0, 
    categoryBreakdown = [], 
    monthlyTotals = [],
    instrumentSummaries = [],
    instrumentCount = 0
  } = analytics || {};

  const primaryRate = userCards?.[0]?.base_reward_rate || 1.0;

  const radarData = categoryBreakdown.map(item => ({
    subject: item.category.toUpperCase().slice(0, 8),
    A: Number(item.total) || 0,
    fullMark: Math.max(...categoryBreakdown.map(i => Number(i.total) || 0), 1)
  }));

  const areaData = monthlyTotals.map((item, i) => ({
    name: item.month.split('-')[1],
    rewards: parseFloat(((Number(item.total) || 0) * (primaryRate / 100)).toFixed(2))
  }));

  return (
    <div className="min-h-screen vault-grid-bg p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
            </span>
            <span className="text-[10px] font-mono text-[#d4af37] tracking-[0.4em] uppercase">TERMINAL_ACTIVE</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black gold-gradient-text tracking-tighter uppercase leading-none">
            {firstName}_VAULT
          </h1>
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
            <Cpu size={12} /> SECURE_FINANCIAL_INTEL_SYSTEM_V5.0.5
          </p>
        </div>
        
        <div className="flex gap-2 bg-[#111]/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-2xl">
           <div className="px-6 py-3 text-center bg-white/5 rounded-xl border border-white/5 vault-card">
              <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">CREDIT_SCORE</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-black text-[#4ade80]">782</p>
                <TrendingUp size={14} className="text-[#4ade80]" />
              </div>
           </div>
           <div className="px-6 py-3 text-center bg-white/5 rounded-xl border border-white/5 vault-card">
              <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">CLEARANCE</p>
              <p className="text-xl font-black text-[#d4af37]">PLATINUM</p>
           </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'TOTAL_MONTHLY_SPEND', value: `₹${monthTotal.toLocaleString()}`, icon: Wallet, color: 'text-white' },
          { label: 'REWARDS_HARVESTED', value: `₹${totalRewardsValue.toLocaleString()}`, icon: Zap, color: 'text-[#d4af37]' },
          { label: 'ACTIVE_INSTRUMENTS', value: instrumentCount, icon: CreditCard, color: 'text-white' },
          { label: 'NETWORK_EFFICIENCY', value: `${((totalRewardsValue / (monthTotal || 1)) * 100).toFixed(2)}%`, icon: Activity, color: 'text-[#4ade80]' },
        ].map((stat, i) => (
          <div key={i} className="vault-card p-6 relative group overflow-hidden rounded-3xl">
            <stat.icon size={56} className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-[#d4af37]/10 transition-all duration-700 group-hover:scale-125" />
            <p className="text-[9px] font-mono text-gray-500 tracking-widest uppercase mb-2">{stat.label}</p>
            <h3 className={`text-3xl font-black ${stat.color} tracking-tight`}>{stat.value}</h3>
            <div className="mt-4 flex items-center gap-1 text-[8px] font-mono text-gray-600">
              <span className="text-[#4ade80]">+2.4%</span> VS_LAST_MONTH
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Radar */}
        <div className="lg:col-span-1 vault-card p-8 flex flex-col h-[580px] rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[#d4af37]" />
              <h3 className="text-xs font-bold text-white tracking-widest uppercase">SPENDING_EQUILIBRIUM</h3>
            </div>
            <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center cursor-help">
              <Info size={12} className="text-gray-500" />
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }} />
                  <Radar
                    name="Spend"
                    dataKey="A"
                    stroke="#d4af37"
                    fill="#d4af37"
                    fillOpacity={0.3}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600 font-mono text-[10px] uppercase text-center">
                INITIALIZING_RADAR_SCAN...<br/>WAITING_FOR_DATA
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-500 font-mono text-center mt-4 uppercase tracking-[0.3em] opacity-50">
            STRATEGIC_CATEGORY_WEIGHTAGE_ANALYSIS
          </p>
        </div>

        {/* Trends */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="vault-card p-8 flex-1 min-h-[580px] flex flex-col relative overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-[#d4af37]" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">REWARDS_YIELD_TRAJECTORY</h3>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#d4af37]" />
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Estimated_Yield</span>
                 </div>
                 <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest">PROJECTION_MODEL</p>
                    <p className="text-[10px] font-bold text-white tracking-widest uppercase">DYNAMIC_V4</p>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#444', fontSize: 11, fontFamily: 'monospace'}} 
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#444', fontSize: 10, fontFamily: 'monospace'}}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="rewards" 
                    stroke="#d4af37" 
                    fill="url(#areaGradient)" 
                    strokeWidth={3}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#d4af37]/30 transition-all duration-500 group">
                  <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest group-hover:text-[#d4af37]">PROJECTED_ANNUAL_YIELD</p>
                  <p className="text-xl font-black text-white">₹{(totalRewardsValue * 12).toLocaleString()}</p>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#4ade80]/30 transition-all duration-500 group">
                  <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest group-hover:text-[#4ade80]">YIELD_STABILITY</p>
                  <p className="text-xl font-black text-[#4ade80]">94.2%</p>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#d4af37]/30 transition-all duration-500 group">
                  <p className="text-[8px] text-gray-500 font-mono mb-1 uppercase tracking-widest group-hover:text-[#d4af37]">VAULT_INTEGRITY</p>
                  <p className="text-xl font-black text-[#d4af37]">SECURE</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vault Intelligence: Category Routing */}
      <div className="vault-card p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Fingerprint size={120} />
        </div>
        <div className="flex items-center gap-2 mb-8">
           <Shield size={18} className="text-[#d4af37]" />
           <h3 className="text-xs font-bold text-white tracking-widest uppercase">VAULT_INTELLIGENCE: CATEGORY_ROUTING</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
           {categoryRouting.map((item, i) => (
             <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/[0.08] transition-all group">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-3 group-hover:text-[#d4af37]">{item.category}</p>
                <p className="text-[11px] font-black text-white uppercase truncate mb-1">{item.bestCard}</p>
                <div className="flex items-center justify-between">
                   <span className="text-[8px] font-mono text-gray-600 uppercase">Yield_Rate</span>
                   <span className="text-[10px] font-black text-[#4ade80]">{item.rate}%</span>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Secondary Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Feed / Logs */}
        <div className="lg:col-span-1 vault-card p-8 h-[400px] flex flex-col rounded-3xl">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#d4af37]" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">SYSTEM_INTEGRITY_LOGS</h3>
              </div>
              <span className="text-[8px] font-mono text-gray-600 animate-pulse">LIVE_FEED_SYNC</span>
           </div>
           <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
              {(analytics?.recentExpenses || []).length > 0 ? (
                analytics.recentExpenses.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start group relative">
                    <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-[#d4af37]/30 transition-all duration-500 group-hover:rotate-12">
                      <Landmark size={16} className="text-gray-500 group-hover:text-[#d4af37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[11px] font-bold text-white tracking-wide uppercase truncate mr-2">{item.description}</p>
                        <span className="text-[9px] font-mono text-gray-600 shrink-0">{item.date.split('-')[2]}/{item.date.split('-')[1]}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-gray-700" /> {item.category}
                        </p>
                        <p className="text-sm font-black text-white">₹{Number(item.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ZapOff size={24} className="text-gray-800 mx-auto mb-2" />
                    <p className="text-gray-600 font-mono text-[10px] uppercase">NO_RECENT_ACTIVITY_LOGGED</p>
                  </div>
                </div>
              )}
           </div>
           <button className="w-full mt-8 bg-white/5 border border-white/5 text-gray-500 py-4 rounded-2xl font-mono text-[10px] tracking-[0.4em] hover:bg-[#d4af37]/10 hover:text-[#d4af37] hover:border-[#d4af37]/20 transition-all uppercase flex items-center justify-center gap-2 group">
              ENCRYPTED_LOG_EXPORT <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>

        {/* Instrument Performance */}
        <div className="lg:col-span-2 vault-card p-8 h-[400px] flex flex-col rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#d4af37]" />
              <h3 className="text-xs font-bold text-white tracking-widest uppercase">ASSET_PERFORMANCE_METRICS</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1 w-${i === 0 ? '8' : '2'} ${i === 0 ? 'bg-[#d4af37]' : 'bg-white/10'} rounded-full`} />
              ))}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 scrollbar-hide">
            {(instrumentSummaries || []).map((inst, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.08] transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                   <Landmark size={80} />
                </div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">{inst.name}</h4>
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Efficiency_Status: ACTIVE</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[10px] font-black text-[#d4af37]">
                    ₹{Number(inst.monthlyRewards).toLocaleString()}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-[9px] font-mono uppercase tracking-tighter">
                    <span className="text-gray-500">Milestone_Progress</span>
                    <span className="text-[#d4af37] font-bold">{inst.milestoneProgress ? Number(inst.milestoneProgress).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-[2px]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#d4af37] via-[#fcf6ba] to-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                      style={{ width: `${inst.milestoneProgress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                    <span>SPENT: ₹{Number(inst.totalSpend).toLocaleString()}</span>
                    <span>GOAL: ₹{(Number(inst.milestoneThreshold) || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-gradient-to-r from-[#d4af37]/10 via-[#d4af37]/5 to-transparent border border-[#d4af37]/20 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-6 mb-6 md:mb-0">
          <div className="h-16 w-16 bg-[#d4af37] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)] group cursor-pointer overflow-hidden relative">
            <ShieldCheck size={32} className="text-black z-10" />
            <div className="absolute inset-0 bg-white/20 translate-y-16 group-hover:translate-y-0 transition-transform duration-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <h4 className="text-lg font-black text-white uppercase tracking-tight">SHADOW_AUDIT_PROTOCOL_ENGAGED</h4>
            </div>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em]">Integrity check synchronized with vault cluster_01</p>
          </div>
        </div>
        <button className="w-full md:w-auto bg-[#d4af37] text-black px-12 py-4 rounded-2xl font-black text-[11px] tracking-[0.3em] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] hover:scale-[1.05] active:scale-95 transition-all uppercase shadow-2xl">
          INITIATE_FULL_SYSTEM_AUDIT
        </button>
      </div>
    </div>
  );
}
