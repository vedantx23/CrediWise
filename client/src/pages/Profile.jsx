import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import { User, Shield, Lock, LogOut, Mail, Calendar, Award, ChevronRight, Save, X, Edit3, Fingerprint, Activity, Monitor, Smartphone, Cpu, Network, Terminal, Plane, ShoppingBag, Utensils, ShoppingCart, Compass } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { userCards } = useCardContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState({});
  const [archetype, setArchetype] = useState({ name: 'EVALUATING...', desc: 'Analyzing spend data', icon: Fingerprint, color: 'text-gray-500' });

  // Sync edit state when user loads
  useEffect(() => {
    if (user?.name) setEditName(user.name);
  }, [user]);

  // Fetch expenses and calculate archetype
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await api.get('/expenses');
        const raw = res.data.expenses || [];
        const aggregate = {};
        raw.forEach(exp => {
          const cat = (exp.category || 'other').toLowerCase();
          aggregate[cat] = (aggregate[cat] || 0) + (Number(exp.amount) || 0);
        });
        setExpenses(aggregate);

        if (Object.keys(aggregate).length > 0) {
          const topCat = Object.keys(aggregate).reduce((a, b) => aggregate[a] > aggregate[b] ? a : b);
          switch(topCat) {
            case 'travel': setArchetype({ name: 'THE JETSETTER', desc: 'Maximizing miles and lounge access', icon: Plane, color: 'text-purple-400' }); break;
            case 'shopping': case 'online': setArchetype({ name: 'DIGITAL SHOPPER', desc: 'E-commerce reward optimizer', icon: ShoppingBag, color: 'text-blue-400' }); break;
            case 'dining': setArchetype({ name: 'THE GASTRONOMER', desc: 'Dining & lifestyle enthusiast', icon: Utensils, color: 'text-orange-400' }); break;
            case 'groceries': setArchetype({ name: 'PRAGMATIST', desc: 'Everyday value extractor', icon: ShoppingCart, color: 'text-green-400' }); break;
            default: setArchetype({ name: 'THE GENERALIST', desc: 'Balanced reward strategy', icon: Compass, color: 'text-[#d4af37]' }); break;
          }
        } else {
          setArchetype({ name: 'THE INITIATE', desc: 'Awaiting spend data integration', icon: Fingerprint, color: 'text-gray-500' });
        }
      } catch (err) {
        console.error('Failed to fetch expenses for profile archetype', err);
      }
    };
    fetchExpenses();
  }, []);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'May 2026';

  const firstName = user?.name ? user.name.split(' ')[0] : 'AGENT';

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ name: editName.trim() });
      if (res.success) {
        toast.success('PROFILE_UPDATED_SUCCESSFULLY');
        setIsEditing(false);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('FAILED_TO_UPDATE_PROFILE');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl font-bold gold-gradient-text tracking-tighter uppercase flex items-center gap-3">
            <Fingerprint className="text-[#d4af37]" /> AGENT_PROFILE
          </h1>
          <p className="text-gray-500 font-mono text-sm mt-1 uppercase tracking-widest">ACCESS_LEVEL: {user?.role?.toUpperCase() || 'PLATINUM'}</p>
        </div>
        <div className="flex gap-4">
           {!isEditing ? (
             <button 
               onClick={() => setIsEditing(true)}
               className="flex items-center gap-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 px-6 py-2 rounded-xl font-mono text-xs hover:border-[#d4af37] transition-all"
             >
               <Edit3 size={14} /> MODIFY_DATA
             </button>
           ) : (
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg"
                >
                  <X size={18} />
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 bg-[#d4af37] text-black px-6 py-2 rounded-xl font-bold text-xs"
                  disabled={saving}
                >
                  <Save size={14} /> {saving ? 'SYNCING...' : 'COMMIT_CHANGES'}
                </button>
             </div>
           )}
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 text-red-500 px-6 py-2 rounded-xl font-mono text-xs hover:bg-red-900/20 transition-all"
           >
             <LogOut size={14} /> TERMINATE_SESSION
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Identity Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#d4af37]" />
            <div className="w-32 h-32 bg-gradient-to-tr from-[#1a1a1a] to-[#0a0a0a] border border-gray-800 rounded-full mx-auto mb-6 flex items-center justify-center p-1 group-hover:border-[#d4af37]/50 transition-all duration-500">
               <img 
                 src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}&backgroundColor=050505`} 
                 className="rounded-full"
                 alt="Avatar"
               />
            </div>
            {isEditing ? (
              <div className="mb-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#d4af37]/50 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#d4af37]"
                  placeholder="Enter Agent Name"
                  autoFocus
                />
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{user?.name || 'AGENT_NULL'}</h2>
            )}
            <p className="text-gray-500 font-mono text-xs mb-6 lowercase">{user?.email || 'unidentified_identity'}</p>
            
            <div className="space-y-4 pt-6 border-t border-gray-800">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-mono">ID_HASH</span>
                  <span className="text-gray-400 font-mono">#0X7F2A...</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 font-mono">MEMBER_SINCE</span>
                  <span className="text-gray-400 font-mono uppercase">{memberSince}</span>
               </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#d4af37]/20 rounded-3xl p-8 relative overflow-hidden">
             <div className="absolute -right-4 -top-4 text-[#d4af37] opacity-10">
               <Award size={120} />
             </div>
             <div className="flex items-center gap-3 mb-6 relative z-10">
                <Award className="text-[#d4af37]" size={20} />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">LOYALTY_TIER</h3>
             </div>
             <p className="text-3xl font-bold text-[#d4af37] mb-2 tracking-tighter uppercase relative z-10">ELITE_OBSIDIAN</p>
             <p className="text-xs text-gray-400 font-mono leading-relaxed relative z-10">
               You are in the top 2% of reward optimizers. 
               Last month you rescued ₹1,240 from reward leakage.
             </p>
             
             <div className="mt-6 pt-6 border-t border-[#d4af37]/20 relative z-10">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] text-[#d4af37] font-mono tracking-widest uppercase">Next Tier: Platinum</span>
                   <span className="text-[10px] text-[#d4af37] font-mono">85%</span>
                </div>
                <div className="w-full bg-[#0a0a0a] rounded-full h-1">
                   <div className="bg-[#d4af37] h-1 rounded-full shadow-[0_0_10px_#d4af37]" style={{ width: '85%' }}></div>
                </div>
             </div>
          </div>

           {/* Archetype Card */}
           <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group mt-6">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-gray-500/5 blur-[50px] group-hover:bg-gray-500/10 transition-all duration-700"></div>
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4 relative z-10">
                 <h3 className="text-sm font-bold text-gray-400 tracking-[0.2em] uppercase flex items-center gap-2">
                   <archetype.icon size={14} className={archetype.color} /> SPENDING_ARCHETYPE
                 </h3>
              </div>
              <p className={`text-2xl font-bold ${archetype.color} mb-2 tracking-tighter uppercase relative z-10`}>{archetype.name}</p>
              <p className="text-xs text-gray-500 font-mono leading-relaxed relative z-10">
                {archetype.desc}
              </p>
              <div className="mt-6 space-y-2 relative z-10">
                 {Object.entries(expenses).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between items-center text-[10px] font-mono">
                       <span className="text-gray-400 uppercase">{cat}</span>
                       <span className="text-[#d4af37]">₹{amt.toLocaleString('en-IN')}</span>
                    </div>
                 ))}
                 {Object.keys(expenses).length === 0 && (
                    <div className="text-[10px] text-gray-600 font-mono">NO_DATA_AVAILABLE</div>
                 )}
              </div>
           </div>
        </div>

        {/* Right: Security & Stats */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 flex items-center gap-4 group hover:border-[#d4af37]/30 transition-all cursor-pointer">
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 text-[#d4af37]">
                   <Shield size={20} />
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-white uppercase tracking-tighter">ENCRYPTION_KEY</h4>
                   <p className="text-[10px] text-gray-600 font-mono">ROTATED_4_HOURS_AGO</p>
                </div>
                <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
             </div>
             <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 flex items-center gap-4 group hover:border-[#d4af37]/30 transition-all cursor-pointer">
                <div className="p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 text-[#d4af37]">
                   <Lock size={20} />
                </div>
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-white uppercase tracking-tighter">PASSWORD_SECURITY</h4>
                   <p className="text-[10px] text-gray-600 font-mono">LAST_CHANGED_MAY_2026</p>
                </div>
                <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-colors" />
             </div>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
             <h3 className="text-sm font-bold text-[#d4af37] tracking-[0.2em] uppercase mb-8 border-b border-gray-800 pb-4 flex items-center justify-between">
                VAULT_METRICS
                <Activity size={16} className="text-[#d4af37]" />
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="group">
                   <p className="text-[10px] text-gray-500 font-mono mb-2 group-hover:text-[#d4af37] transition-colors">INSTRUMENTS</p>
                   <p className="text-3xl font-bold text-white group-hover:scale-110 transform origin-left transition-all">{userCards.length}</p>
                </div>
                <div className="group">
                   <p className="text-[10px] text-gray-500 font-mono mb-2 group-hover:text-[#d4af37] transition-colors">QUERIES</p>
                   <p className="text-3xl font-bold text-white group-hover:scale-110 transform origin-left transition-all">124</p>
                </div>
                <div className="group">
                   <p className="text-[10px] text-gray-500 font-mono mb-2 group-hover:text-[#d4af37] transition-colors">NAV_SCORE</p>
                   <p className="text-3xl font-bold text-green-400 group-hover:scale-110 transform origin-left transition-all shadow-green-500/20">92/100</p>
                </div>
                <div className="group">
                   <p className="text-[10px] text-gray-500 font-mono mb-2 group-hover:text-[#d4af37] transition-colors">AUTH_STATUS</p>
                   <p className="text-xl font-bold text-[#d4af37] mt-1 group-hover:scale-105 transform origin-left transition-all">VERIFIED</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Active Connections */}
            <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-32 h-32 bg-[#d4af37]/5 blur-[50px] group-hover:bg-[#d4af37]/10 transition-all duration-700"></div>
               <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4 relative z-10">
                  <h3 className="text-sm font-bold text-[#d4af37] tracking-[0.2em] uppercase flex items-center gap-2">
                    <Network size={14} /> ACTIVE_UPLINKS
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
               </div>
               <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800/50 hover:border-[#d4af37]/30 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-500/10 text-green-400 rounded-lg"><Monitor size={16} /></div>
                        <div>
                           <p className="text-white font-mono text-sm uppercase">PRIMARY_TERMINAL</p>
                           <p className="text-gray-500 font-mono text-[10px]">IP: 192.168.1.104 • SECURE</p>
                        </div>
                     </div>
                     <span className="text-[#d4af37] font-mono text-[10px] border border-[#d4af37]/30 px-2 py-1 rounded">CURRENT</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-xl border border-gray-900">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-900 text-gray-500 rounded-lg"><Smartphone size={16} /></div>
                        <div>
                           <p className="text-gray-400 font-mono text-sm uppercase">MOBILE_NODE</p>
                           <p className="text-gray-600 font-mono text-[10px]">IP: 10.0.0.45 • OFFLINE</p>
                        </div>
                     </div>
                     <span className="text-gray-600 font-mono text-[10px]">2H_AGO</span>
                  </div>
               </div>
            </div>

            {/* System Logs */}
            <div className="bg-[#050505] border border-gray-800 rounded-3xl p-8 flex flex-col relative overflow-hidden group">
               <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/5 blur-[50px] group-hover:bg-blue-500/10 transition-all duration-700"></div>
               <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4 relative z-10">
                  <h3 className="text-sm font-bold text-gray-400 tracking-[0.2em] uppercase flex items-center gap-2">
                    <Terminal size={14} /> SYSTEM_LOGS
                  </h3>
                  <Cpu size={14} className="text-gray-600" />
               </div>
               <div className="flex-1 font-mono text-[10px] space-y-3 relative z-10 text-gray-500">
                  <p><span className="text-green-500">[OK]</span> AUTH_TOKEN_VALIDATED</p>
                  <p><span className="text-blue-500">[INFO]</span> FETCHING_REWARD_RATES...</p>
                  <p><span className="text-green-500">[OK]</span> DB_SYNC_COMPLETE</p>
                  <p><span className="text-yellow-500">[WARN]</span> UNUSUAL_SPEND_DETECTED_IN_DINING</p>
                  <p><span className="text-[#d4af37] animate-pulse">[SYS]</span> WAITING_FOR_COMMAND...</p>
               </div>
               <div className="mt-4 pt-4 border-t border-gray-800 relative z-10 flex justify-end">
                  <button className="text-gray-500 hover:text-white font-mono text-[10px] flex items-center gap-1 transition-colors">
                     VIEW_ALL_LOGS <ChevronRight size={10} />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
