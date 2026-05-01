import React, { useState, useEffect } from 'react';
import SpendDial from '../components/SpendDial';
import CreditCard3D from '../components/CreditCard3D';
import PersonaScanner from '../components/PersonaScanner';

const AuditPage = () => {
  const [spend, setSpend] = useState({
    dining: 5000,
    online: 10000,
    travel: 2000,
    grocery: 3000,
    fuel: 2000,
    utilities: 1500,
    international: 0
  });

  const [auditData, setAuditData] = useState(null);
  const [persona, setPersona] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0);

  const handleAudit = async () => {
    // In a real app, this would call the API
    // const res = await fetch('/api/audit', { ... });
    // For demo, we simulate
    setAuditData({
      leakage_inr: 4500,
      status: 'warning',
      recommendations: [
        { card_id: 'hdfc_millennia', card_name: 'HDFC Millennia', reason: 'High online cashback' }
      ]
    });
  };

  const handlePersona = async () => {
    setShowScanner(true);
    // Simulate API call
    setTimeout(() => {
      setPersona({
        persona_name: "The High-Street Architect",
        description: "High dining and shopping focus."
      });
    }, 500);
  };

  return (
    <div className="min-h-screen p-8 pt-20">
      {showScanner && <PersonaScanner persona={persona} onComplete={() => setShowScanner(false)} />}
      
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black gold-gradient-text tracking-tighter">Shadow Audit</h1>
            <p className="text-platinum/50 text-sm">Financial Intelligence Terminal</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handlePersona} className="px-6 py-2 border border-gold/50 text-gold hover:bg-gold/10 transition-all uppercase text-xs font-bold tracking-widest rounded">
              Reveal Persona
            </button>
            <button onClick={handleAudit} className="px-6 py-2 bg-gold text-obsidian hover:scale-105 transition-all uppercase text-xs font-bold tracking-widest rounded">
              Run Audit
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Spend Input Section */}
          <div className="bg-glass border border-glass-border p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-gold opacity-70">Monthly Spend Allocation</h3>
            {Object.keys(spend).map(cat => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase tracking-widest">
                  <span>{cat}</span>
                  <span className="text-gold">₹{spend[cat]}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="50000" 
                  step="500"
                  value={spend[cat]} 
                  onChange={(e) => setSpend({...spend, [cat]: parseInt(e.target.value)})}
                  className="w-full accent-gold bg-platinum/10 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Visualization Section */}
          <div className="flex flex-col items-center justify-center space-y-8">
            <SpendDial totalSpend={totalSpend} rewardRate={1.5} />
            
            {auditData && (
              <div className={`p-4 rounded-xl border w-full text-center ${
                auditData.status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}>
                <div className="text-[10px] uppercase font-bold">Annual Leakage Detected</div>
                <div className="text-2xl font-black">₹{auditData.leakage_inr.toLocaleString('en-IN')}</div>
              </div>
            )}
          </div>

          {/* Cards Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gold opacity-70">Your Active Arsenal</h3>
            <CreditCard3D 
              cardName="Regalia Gold" 
              bank="HDFC BANK" 
              last4="8829" 
              rewards={{dining: 4.0, travel: 3.3, online: 2.0, other: 1.3}} 
            />
            <div className="text-[10px] text-platinum/30 italic">Hover to flip card</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
