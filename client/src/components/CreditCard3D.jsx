import React from 'react';

const CreditCard3D = ({ cardName, bank, last4, rewards }) => {
  return (
    <div className="card-container w-80 h-48 cursor-pointer">
      <div className="card-inner">
        {/* Front */}
        <div className="card-front p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="text-sm font-bold opacity-70 uppercase tracking-widest">{bank}</div>
            <div className="w-10 h-6 bg-gold opacity-30 rounded-sm"></div>
          </div>
          <div className="text-xl font-medium tracking-wide">{cardName}</div>
          <div className="flex justify-between items-end">
            <div className="text-lg tracking-widest">**** **** **** {last4}</div>
            <div className="text-xs opacity-50">GOLD MEMBER</div>
          </div>
        </div>

        {/* Back */}
        <div className="card-back flex flex-col">
          <h4 className="text-xs text-gold font-bold mb-2 uppercase tracking-tighter">Reward Rates</h4>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[10px] text-platinum">
              <thead>
                <tr className="border-b border-glass-border">
                  <th className="text-left py-1">Category</th>
                  <th className="text-right py-1">Rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rewards).map(([cat, rate]) => (
                  <tr key={cat} className="border-b border-glass-border/20">
                    <td className="py-1 uppercase">{cat}</td>
                    <td className="py-1 text-right text-gold">{rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCard3D;
