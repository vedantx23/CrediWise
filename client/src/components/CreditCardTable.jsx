import { useCardContext } from '../context/CardContext';
import './CreditCardTable.css';

export default function CreditCardTable() {
  const { userCards } = useCardContext();

  return (
    <div className="card table-card">
      <div className="table-header">
        <h3 className="chart-title" style={{ marginBottom: 0 }}>Tracked Credit Cards</h3>
        <button className="btn btn-primary btn-sm">Add Card</button>
      </div>
      
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Card Name</th>
              <th>Bank</th>
              <th>Min Income</th>
              <th>Annual Fee</th>
              <th>Reward Rate</th>
              <th>Value / Point</th>
              <th>Lounge Access</th>
              <th>International</th>
              <th>Fee Waiver</th>
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
                <td>{card.Min_Income_LPA}</td>
                <td>₹{card.Annual_Fee_INR.toLocaleString()}</td>
                <td>
                  <div style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={card.Reward_Rate}>
                    {card.Reward_Rate}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>₹{card.Reward_Value_Per_Point_INR.toFixed(2)}</td>
                <td>{card.Lounge_Access.startsWith('Yes') || card.Lounge_Access.startsWith('Unlimited') ? <span style={{color: 'var(--accent-green)'}}>✔️</span> : <span style={{color: 'var(--text-muted)'}}>—</span>}</td>
                <td>{card.International_Usage.startsWith('Yes') ? <span style={{color: 'var(--accent-green)'}}>✔️</span> : <span style={{color: 'var(--text-muted)'}}>—</span>}</td>
                <td style={{ fontSize: '12px' }}>{card.Spend_Based_Fee_Waiver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
