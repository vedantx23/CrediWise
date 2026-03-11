import { useState } from 'react';
import { useCardContext } from '../context/CardContext';
import toast from 'react-hot-toast';
import './Instruments.css';

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
      await removeUserCard(card.Card_Name);
      toast.success('Card removed');
    } catch (err) {
      toast.error('Failed to remove card. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="page-body">
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-title">Loading your cards...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Credit Cards</h1>
          <p className="page-subtitle">Manage your tracked payment instruments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Card</button>
      </div>

      {userCards.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-icon">💳</div>
          <div className="empty-title">No cards added yet</div>
          <div className="empty-subtitle">Add your first credit card to start tracking rewards</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Your First Card</button>
        </div>
      ) : (
        <div className="card table-card" style={{ marginTop: '24px' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Card Name</th>
                  <th>Bank</th>
                  <th>Annual Fee</th>
                  <th>Reward Rate</th>
                  <th>Reward Type</th>
                  <th>Lounge Access</th>
                  <th>Fee Waiver</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userCards.map((card, idx) => (
                  <tr key={card._instrumentId || idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{card.Card_Name}</td>
                    <td>
                      <span className={`badge badge-${card.Bank === 'HDFC' ? 'blue' : card.Bank === 'Axis' ? 'red' : card.Bank === 'SBI' ? 'green' : 'gray'}`}>
                        {card.Bank}
                      </span>
                    </td>
                    <td>₹{card.Annual_Fee_INR.toLocaleString()}</td>
                    <td>{card.Reward_Rate}</td>
                    <td>{card.Reward_Type}</td>
                    <td>{card.Lounge_Access}</td>
                    <td style={{ fontSize: '12px' }}>{card.Spend_Based_Fee_Waiver}</td>
                    <td>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleRemoveCard(card)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Card</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCard}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Select Card</label>
                <select 
                  className="form-select" 
                  value={selectedCardName} 
                  onChange={e => setSelectedCardName(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">Choose a card...</option>
                  {availableCards.map(card => (
                    <option key={card.Card_Name} value={card.Card_Name}>
                      {card.Card_Name} ({card.Bank})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
