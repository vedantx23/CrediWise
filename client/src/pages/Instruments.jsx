import { useState } from 'react';
import { useCardContext } from '../context/CardContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, CreditCard, Banknote, ShieldCheck } from 'lucide-react';

export default function Instruments() {
  const { userCards, availableCards, addUserCard, removeUserCard, loading } = useCardContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedCardName, setSelectedCardName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddCard = async (e) => {
    e.preventDefault();
    const cardToAdd = availableCards.find(c => c.Card_Name === selectedCardName);
    if (cardToAdd) {
      setSaving(true);
      try {
        await addUserCard(cardToAdd);
        toast.success(`${cardToAdd.Card_Name} added successfully!`);
        setShowModal(false);
        setSelectedCardName('');
      } catch (err) {
        toast.error('Failed to add card. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      toast.error('Please select a valid card');
    }
  };

  const handleRemoveCard = async (card) => {
    if (!confirm(`Remove ${card.Card_Name}?`)) return;
    try {
      await removeUserCard(card._instrumentId);
      toast.success('Card removed');
    } catch (err) {
      toast.error('Failed to remove card. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#d4af37] animate-pulse text-lg font-mono tracking-widest">
          INITIALIZING_VAULT_ASSETS...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold gold-gradient-text tracking-tighter">THE VAULT: INSTRUMENTS</h1>
          <p className="text-gray-500 font-mono text-sm mt-2">SECURE_CARD_MANAGEMENT_TERMINAL_V2.0</p>
        </div>
        <button 
          className="flex items-center gap-2 bg-[#d4af37] text-black px-6 py-3 rounded-full font-bold hover:bg-[#b38728] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} /> ADD_NEW_INSTRUMENT
        </button>
      </div>

      {userCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-800 rounded-3xl bg-[#0a0a0a]">
          <div className="bg-[#111] p-6 rounded-full mb-6 border border-gray-800">
            <CreditCard size={48} className="text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-400 mb-2">NO_INSTRUMENTS_DETECTED</h2>
          <p className="text-gray-600 mb-8 max-w-md text-center">Your card stack is empty. Initialize your first credit card to start reward optimization.</p>
          <button 
            className="text-[#d4af37] border border-[#d4af37] px-8 py-3 rounded-full hover:bg-[#d4af37]/10 transition-all font-bold"
            onClick={() => setShowModal(true)}
          >
            INITIALIZE_FIRST_CARD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userCards.map((card, idx) => (
            <div key={card._instrumentId || idx} className="group relative bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-[#d4af37]/50 transition-all duration-500 overflow-hidden">
              {/* Card Decoration */}
              <div className="absolute -right-4 -top-4 text-gray-800/20 group-hover:text-[#d4af37]/5 transition-colors">
                <CreditCard size={120} />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-mono text-[#d4af37] uppercase tracking-[0.2em]">{card.Bank}</span>
                    <h3 className="text-xl font-bold text-white mt-1">{card.Card_Name}</h3>
                  </div>
                  <button 
                    onClick={() => handleRemoveCard(card)}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors bg-[#1a1a1a] rounded-lg border border-gray-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                      <Banknote size={16} className="text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-mono">ANNUAL_FEE</p>
                      <p className="text-sm font-bold text-gray-300">₹{card.Annual_Fee_INR.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1a1a1a] rounded-lg border border-gray-800">
                      <ShieldCheck size={16} className="text-[#d4af37]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-mono">REWARD_STRENGTH</p>
                      <p className="text-sm font-bold text-gray-300">{card.Reward_Rate} ({card.Reward_Type})</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-800/50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-600 font-mono uppercase">LOUNGE_ACCESS</span>
                    <span className="text-xs text-gray-400 font-bold">{card.Lounge_Access}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[9px] text-gray-600 font-mono uppercase">FEE_WAIVER</span>
                    <span className="text-[10px] text-gray-400 font-bold max-w-[120px] leading-tight">{card.Spend_Based_Fee_Waiver}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Card Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#111] border border-[#d4af37]/30 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#161616]">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Plus size={20} className="text-[#d4af37]" /> INITIALIZE_NEW_INSTRUMENT
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddCard} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">SELECT_CATALOG_INSTRUMENT</label>
                <select 
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37] transition-all appearance-none" 
                  value={selectedCardName} 
                  onChange={e => setSelectedCardName(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">CHOOSE_A_CARD...</option>
                  {availableCards.map(card => (
                    <option key={card.Card_Name} value={card.Card_Name}>
                      {card.Card_Name} ({card.Bank})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  className="flex-1 bg-transparent border border-gray-700 text-gray-400 px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
                  onClick={() => setShowModal(false)} 
                  disabled={saving}
                >
                  ABORT
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#d4af37] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#b38728] transition-all disabled:opacity-50 flex items-center justify-center"
                  disabled={saving}
                >
                  {saving ? 'PROCESSING...' : 'INITIALIZE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
