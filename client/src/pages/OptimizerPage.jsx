import React, { useState, useEffect } from 'react';
import api from '../api';

const CATEGORIES = [
  'Food & Dining', 'Travel', 'Shopping', 'Entertainment',
  'Groceries', 'Fuel', 'Utilities & Bills', 'Rent',
  'Health & Medical', 'Education', 'Insurance', 'Government', 'Other'
];

const CHANNELS = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline / POS' },
  { value: 'upi', label: 'UPI' },
  { value: 'portal', label: 'Portal (SmartBuy/Grab Deals)' },
];

export default function OptimizerPage() {
  const [allCards, setAllCards] = useState([]);
  const [myWalletCards, setMyWalletCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [channel, setChannel] = useState('online');
  const [merchant, setMerchant] = useState('');
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    const init = async () => {
      const cards = await fetchCards();
      if (cards) await fetchMyWallet(cards);
    };
    init();
  }, []);

  async function fetchCards() {
    try {
      const res = await api.get('/optimizer/cards');
      setAllCards(res.data.cards);
      return res.data.cards;
    } catch (err) {
      console.error('Failed to fetch cards', err);
      return null;
    }
  }

  async function fetchMyWallet(loadedCards) {
    try {
      const res = await api.get('/instruments');
      const rawNames = (res.data.instruments || []).map(i => i.name);
      setMyWalletCards(rawNames);
      
      const cardsToUse = loadedCards || allCards;
      
      // Auto-select wallet cards using standardized directory names
      const initialSelected = rawNames.map(name => {
        const std = name.toLowerCase().replace(/ credit card$/, '').trim();
        const full = cardsToUse.find(c => c.name.toLowerCase().replace(/ credit card$/, '').trim() === std);
        return full ? full.name : name;
      });
      setSelectedCards(initialSelected);
    } catch (err) {
      console.error('Failed to fetch wallet instruments', err);
    }
  }

  const standardize = (name) => name.toLowerCase().replace(/ credit card$/, '').trim();

  function toggleCard(name) {
    const stdName = standardize(name);
    // Find the full name from allCards to keep it standardized
    const fullCard = allCards.find(c => standardize(c.name) === stdName);
    const targetName = fullCard ? fullCard.name : name;

    setSelectedCards(prev =>
      prev.includes(targetName) ? prev.filter(c => c !== targetName) : [...prev, targetName]
    );
  }

  async function handleOptimize(e) {
    e.preventDefault();
    if (selectedCards.length === 0 || !amount) return;
    setLoading(true);
    try {
      const res = await api.post('/optimizer/recommend', {
        userCards: selectedCards,
        amount: Number(amount),
        category,
        channel,
        merchant
      });
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="optimizer-page">
      <div className="optimizer-header">
        <h1>⚡ Transaction Optimizer</h1>
        <p className="subtitle">Find the best card for every transaction — accounting for accelerated rewards, exclusions, caps & UPI benefits</p>
      </div>

      {/* Card Selection */}
      <div className="card-selection">
        <h3>Selected Cards ({selectedCards.length})</h3>
        {myWalletCards.length > 0 ? (
          <div className="card-grid">
            {myWalletCards.map(name => {
              const stdName = standardize(name);
              const card = allCards.find(c => standardize(c.name) === stdName);
              const fullName = card ? card.name : name;
              const isSelected = selectedCards.includes(fullName);

              return (
                <button
                  key={name}
                  className={`card-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleCard(name)}
                >
                  <span className="chip-bank">{card?.bank || 'WALLET'}</span>
                  <span className="chip-name">{name.replace(/ Credit Card$/, '')}</span>
                  {card?.has_upi_benefits && <span className="upi-badge">UPI</span>}
                  <span className="wallet-badge">WALLET</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--plat-muted)', fontSize: '12px' }}>
            No cards in your wallet yet. Add cards from the directory below or go to <a href="/cards" style={{color:'var(--gold-bright)'}}>My Cards</a>.
          </p>
        )}

        <button
          className="toggle-directory-btn"
          onClick={() => setShowDirectory(!showDirectory)}
        >
          {showDirectory ? '▾ Hide full directory' : '▸ Browse full card directory to add more'}
        </button>

        {showDirectory && (
          <div className="card-grid directory-grid">
            {allCards.filter(c => !myWalletCards.some(m => standardize(m) === standardize(c.name))).map(card => (
              <button
                key={card.name}
                className={`card-chip ${selectedCards.includes(card.name) ? 'selected' : ''}`}
                onClick={() => toggleCard(card.name)}
              >
                <span className="chip-bank">{card.bank}</span>
                <span className="chip-name">{card.name.replace(/ Credit Card$/, '')}</span>
                {card.has_upi_benefits && <span className="upi-badge">UPI</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Optimizer Form */}
      <form onSubmit={handleOptimize} className="optimizer-form">
        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Merchant (optional)</label>
            <input type="text" value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="e.g. swiggy, amazon" />
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={loading || selectedCards.length === 0}>
          {loading ? 'Analyzing...' : '⚡ Find Best Card'}
        </button>
      </form>

      {/* Results */}
      {recommendations && (
        <div className="results">
          <h3>Recommendations</h3>
          {recommendations.map((rec, i) => (
            <div key={i} className={`rec-card ${rec.isBest ? 'best' : ''} ${rec.isExcluded ? 'excluded' : ''}`}>
              <div className="rec-header">
                <div className="rec-rank">{rec.isBest ? '🏆' : rec.isExcluded ? '🚫' : `#${i + 1}`}</div>
                <div className="rec-info">
                  <div className="rec-name">{rec.card.name}</div>
                  <div className="rec-bank">{rec.card.bank} • {rec.card.network}</div>
                </div>
                <div className="rec-value">
                  <div className="rec-amount">{rec.isExcluded ? 'EXCLUDED' : `₹${rec.rewardAmount}`}</div>
                  <div className="rec-rate">{rec.effectiveRate}% effective</div>
                </div>
              </div>
              {rec.matchedAccelerator && !rec.isExcluded && (
                <div className="rec-accelerator">
                  🚀 {rec.matchedAccelerator.description} ({rec.matchedAccelerator.channel})
                </div>
              )}
              {rec.milestoneInfo && (
                <div className={`rec-milestone ${rec.milestoneInfo.triggered ? 'triggered' : ''}`}>
                  {rec.milestoneInfo.message}
                </div>
              )}
              {rec.warnings.map((w, wi) => (
                <div key={wi} className={`rec-warning severity-${w.severity}`}>
                  {w.message}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .optimizer-page { padding: 32px 40px; max-width: 1100px; }
        .optimizer-header h1 {
          font-size: 28px; font-weight: 300;
          color: var(--gold-bright, #D4AF37); margin: 0;
        }
        .subtitle { color: var(--plat-muted, #4A5568); font-size: 13px; margin: 4px 0 24px; }
        .card-selection { margin-bottom: 24px; }
        .card-selection h3 { font-size: 14px; color: var(--plat-white, #E8EDF2); margin-bottom: 12px; }
        .card-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .card-chip {
          padding: 6px 12px; border-radius: 6px;
          border: 1px solid rgba(212,175,55,0.15);
          background: var(--bg-raised, #0D1219);
          color: var(--plat-muted, #4A5568);
          font-size: 11px; cursor: pointer;
          transition: all 150ms;
          display: flex; flex-direction: column; gap: 2px; position: relative;
        }
        .card-chip.selected {
          background: rgba(212,175,55,0.12);
          border-color: var(--gold-bright, #D4AF37);
          color: var(--gold-bright, #D4AF37);
        }
        .chip-bank { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
        .chip-name { font-size: 11px; font-weight: 500; }
        .upi-badge { position: absolute; top: -4px; right: -4px; background: #10B981; color: #000; font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
        .wallet-badge { position: absolute; bottom: -4px; right: -4px; background: var(--gold-bright, #D4AF37); color: #000; font-size: 7px; font-weight: 700; padding: 1px 4px; border-radius: 4px; }
        .toggle-directory-btn {
          margin-top: 12px; padding: 8px 16px; background: none;
          border: 1px dashed rgba(212,175,55,0.2); border-radius: 6px;
          color: var(--plat-muted, #4A5568); font-size: 11px; cursor: pointer;
        }
        .toggle-directory-btn:hover { border-color: var(--gold-bright, #D4AF37); color: var(--gold-bright, #D4AF37); }
        .directory-grid { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(212,175,55,0.08); }
        .optimizer-form {
          background: var(--bg-raised, #0D1219);
          border: 1px solid rgba(212,175,55,0.1); border-radius: 12px;
          padding: 24px; margin-bottom: 24px;
        }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 16px; }
        .form-group label { display: block; font-size: 11px; color: var(--plat-muted, #4A5568); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group input, .form-group select { width: 100%; padding: 8px 12px; background: var(--bg-surface, #080C12); border: 1px solid rgba(212,175,55,0.15); border-radius: 6px; color: var(--plat-white, #E8EDF2); font-size: 13px; }
        .submit-btn { padding: 12px 28px; background: var(--gold-bright, #D4AF37); color: #0a0a10; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .results h3 { color: var(--plat-white, #E8EDF2); font-size: 16px; margin-bottom: 12px; }
        .rec-card { background: var(--bg-raised, #0D1219); border: 1px solid rgba(212,175,55,0.1); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
        .rec-card.best { border-color: var(--gold-bright, #D4AF37); box-shadow: 0 0 20px rgba(212,175,55,0.1); }
        .rec-card.excluded { opacity: 0.5; border-color: rgba(248,113,113,0.3); }
        .rec-header { display: flex; align-items: center; gap: 12px; }
        .rec-rank { font-size: 20px; width: 40px; text-align: center; }
        .rec-info { flex: 1; }
        .rec-name { font-size: 14px; font-weight: 600; color: var(--plat-white, #E8EDF2); }
        .rec-bank { font-size: 11px; color: var(--plat-muted, #4A5568); }
        .rec-value { text-align: right; }
        .rec-amount { font-size: 18px; font-weight: 700; color: var(--gold-bright, #D4AF37); }
        .rec-rate { font-size: 11px; color: var(--plat-muted, #4A5568); }
        .rec-accelerator { margin-top: 8px; padding: 6px 10px; background: rgba(16,185,129,0.08); border-radius: 6px; font-size: 12px; color: #10B981; }
        .rec-milestone { margin-top: 6px; font-size: 12px; color: var(--plat-muted, #4A5568); }
        .rec-milestone.triggered { color: var(--gold-bright, #D4AF37); font-weight: 600; }
        .rec-warning { margin-top: 6px; font-size: 11px; padding: 4px 8px; border-radius: 4px; }
        .rec-warning.severity-high { background: rgba(248,113,113,0.1); color: #F87171; }
        .rec-warning.severity-medium { background: rgba(251,191,36,0.1); color: #FBBF24; }
      `}</style>
    </div>
  );
}
