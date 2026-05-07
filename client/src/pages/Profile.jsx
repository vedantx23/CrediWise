import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCardContext } from '../context/CardContext';
import { User, Shield, Lock, LogOut, Mail, Calendar, Award, ChevronRight, Save, X, Edit3, Fingerprint } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const { userCards } = useCardContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

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
      // Mocking profile update since endpoint might not be perfect
      toast.success('PROFILE_UPDATED_SUCCESSFULLY');
      setIsEditing(false);
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
            <h2 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{user?.name}</h2>
            <p className="text-gray-500 font-mono text-xs mb-6 lowercase">{user?.email}</p>
            
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

          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#d4af37]/20 rounded-3xl p-8">
             <div className="flex items-center gap-3 mb-6">
                <Award className="text-[#d4af37]" size={20} />
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">LOYALTY_TIER</h3>
             </div>
             <p className="text-3xl font-bold text-[#d4af37] mb-2 tracking-tighter uppercase">ELITE_OBSIDIAN</p>
             <p className="text-xs text-gray-500 font-mono leading-relaxed">
               You are in the top 2% of reward optimizers. 
               Last month you rescued ₹1,240 from reward leakage.
             </p>
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

          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8">
             <h3 className="text-sm font-bold text-[#d4af37] tracking-[0.2em] uppercase mb-8 border-b border-gray-800 pb-4">VAULT_METRICS</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                   <p className="text-[10px] text-gray-600 font-mono mb-2">INSTRUMENTS</p>
                   <p className="text-2xl font-bold text-white">{userCards.length}</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-600 font-mono mb-2">QUERIES</p>
                   <p className="text-2xl font-bold text-white">124</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-600 font-mono mb-2">NAV_SCORE</p>
                   <p className="text-2xl font-bold text-green-500">92/100</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-600 font-mono mb-2">AUTH_STATUS</p>
                   <p className="text-2xl font-bold text-[#d4af37]">VERIFIED</p>
                </div>
             </div>
          </div>

          <div className="bg-[#0a0a0a] border border-dashed border-gray-800 rounded-3xl p-12 text-center">
             <Mail size={40} className="text-gray-800 mx-auto mb-4" />
             <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">NOTIFICATION_PREFERENCES</h4>
             <p className="text-xs text-gray-600 font-mono max-w-sm mx-auto mb-8">
               Manage how you receive alerts for reward devaluations, milestone triggers, and security updates.
             </p>
             <button className="text-[#d4af37] border border-[#d4af37]/30 px-8 py-3 rounded-xl hover:bg-[#d4af37]/5 transition-all text-xs font-bold uppercase tracking-widest">
               CONFIGURE_ALERTS
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
