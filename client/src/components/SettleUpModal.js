import React, { useState } from 'react';
import api from '../api';
import './Balances.css';

const SettleUpModal = ({ group, currentUser, debtor, onBack, onSettled }) => {
  const [amount, setAmount] = useState(Math.abs(debtor.netBalance).toFixed(2));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount');
      return;
    }
    setLoading(true);
    try {
      await api.post('/payments', {
        groupId: group.id,
        payerId: currentUser.id, // Current user is paying
        payeeId: debtor.userId,  // The person who is owed
        amount: parseFloat(amount),
        currency: group.currency || 'USD',
        notes,
      });
      onSettled();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to settle up');
      setLoading(false);
    }
  };

  return (
    <div className="create-expense-overlay">
      <div className="create-expense-modal">
        <div className="modal-header">
          <h3>Settle up with {debtor.username}</h3>
          <button onClick={onBack} className="close-btn">×</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" required />
          </div>
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onBack}>Cancel</button>
            <button type="submit" disabled={loading}>{loading ? 'Settling...' : 'Settle Up'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettleUpModal; 