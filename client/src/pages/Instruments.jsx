import { useState } from 'react';
import { useCardContext } from '../context/CardContext';
import toast from 'react-hot-toast';
import './Instruments.css';

export default function Instruments() {
  const { userCards, availableCards, addUserCard, removeUserCard } = useCardContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedCardName, setSelectedCardName] = useState('');

  const handleAddCard = (e) => {
    e.preventDefault();
    const cardToAdd = availableCards.find(c => c.Card_Name === selectedCardName);
    if (cardToAdd) {
      addUserCard(cardToAdd);
      toast.success(`${cardToAdd.Card_Name} added successfully!`);
      setShowModal(false);
      setSelectedCardName('');
    } else {
      toast.error('Please select a valid card');
    }
  };

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
                  <tr key={idx}>
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
                        onClick={() => {
                          if(confirm(`Remove ${card.Card_Name}?`)) {
                            removeUserCard(card.Card_Name);
                            toast.success('Card removed');
                          }
                        }}
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Card</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
