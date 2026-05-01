import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, CreditCard, Fingerprint, Brain, FileText, Zap } from 'lucide-react';

const VaultNav = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Audit', path: '/', icon: <Shield size={20} /> },
    { name: 'Cards', path: '/cards', icon: <CreditCard size={20} /> },
    { name: 'Oracle', path: '/rewards', icon: <Brain size={20} /> },
    { name: 'Forensics', path: '/spending', icon: <FileText size={20} /> },
    { name: 'Dashboard', path: '/insights', icon: <Zap size={20} /> },
    { name: 'Profile', path: '/profile', icon: <Fingerprint size={20} /> },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-[72px] bg-[#050505] border-r border-gray-800 flex flex-col items-center py-8 z-50">
      <div className="mb-12">
        <div className="h-10 w-10 bg-gradient-to-tr from-[#bf953f] to-[#fcf6ba] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
           <span className="text-black font-black text-xl">C</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/insights');
          
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={`group relative p-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                  : 'text-gray-600 hover:text-[#d4af37] hover:bg-[#111]'
              }`}
            >
              {item.icon}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1 bg-[#d4af37] text-black text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                {item.name}
              </div>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto">
         <div className="text-[8px] font-mono text-gray-700 vertical-text tracking-[0.5em] uppercase">
            VAULT_V2.0
         </div>
      </div>
    </nav>
  );
};

export default VaultNav;
