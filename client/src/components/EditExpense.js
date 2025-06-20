import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css';

const EditExpense = ({ expense, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: expense.title,
    amount: expense.amount.toString(),
    description: expense.description || ''
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' or 'custom'
  const [customSplits, setCustomSplits] = useState({});

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchGroupMembers();
    // Set selected members from expense
    setSelectedMembers(expense.members.map(m => m.user_id));
    if (expense) {
      // Initialize split mode and custom splits
      const isCustom = expense.members.some(m => m.share_amount !== expense.amount / expense.members.length);
      setSplitMode(isCustom ? 'custom' : 'equal');
      const initialSplits = {};
      expense.members.forEach(member => {
        initialSplits[member.user_id] = member.share_amount;
      });
      setCustomSplits(initialSplits);
    }
  }, [expense.id]);

  const fetchGroupMembers = async () => {
    try {
      const response = await api.get(`/groups/${expense.group_id}`);
      setGroupMembers(response.data.members);
    } catch (err) {
      setError('Failed to fetch group members');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleCustomSplitChange = (memberId, value) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: value }));
  };

  const validateCustomSplits = () => {
    if (splitMode !== 'custom') return true;
    const total = Object.values(customSplits)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    return Math.abs(total - parseFloat(formData.amount)) < 0.01;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Expense title is required');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('At least one member must be selected');
      return;
    }

    if (splitMode === 'custom' && !validateCustomSplits()) {
      setError('Sum of custom splits must equal the total amount');
      return;
    }

    setLoading(true);

    try {
      const expenseData = {
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        memberIds: selectedMembers,
        splits: splitMode === 'custom' 
          ? selectedMembers.map(id => ({ userId: id, amount: parseFloat(customSplits[id]) })) 
          : null,
      };

      await onSave(expenseData);
    } catch (err) {
      setError(err.message || 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-expense-overlay">
      <div className="edit-expense-modal">
        <div className="modal-header">
          <h3>Edit Expense</h3>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="expenseTitle">Expense Title *</label>
            <input
              type="text"
              id="expenseTitle"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Dinner, Gas, Rent"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="expenseAmount">Amount ($) *</label>
            <input
              type="number"
              id="expenseAmount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="expenseDescription">Description</label>
            <textarea
              id="expenseDescription"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label>Split Between Members *</label>
            <div className="split-mode-toggle">
              <button type="button" className={splitMode === 'equal' ? 'active' : ''} onClick={() => setSplitMode('equal')}>Equal</button>
              <button type="button" className={splitMode === 'custom' ? 'active' : ''} onClick={() => setSplitMode('custom')}>Custom</button>
            </div>
            <div className="members-selection">
              {groupMembers.map(member => (
                <div key={member.user_id} className="member-item">
                  <label className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.user_id)}
                      onChange={() => handleMemberToggle(member.user_id)}
                    />
                    <span className="member-name">{member.username}</span>
                  </label>
                  {splitMode === 'custom' && selectedMembers.includes(member.user_id) && (
                    <input
                      type="number"
                      className="split-input"
                      value={customSplits[member.user_id]}
                      onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                    />
                  )}
                </div>
              ))}
            </div>
            {splitMode === 'equal' && selectedMembers.length > 0 && (
              <p className="split-info">
                Each member will pay: ${(parseFloat(formData.amount || 0) / selectedMembers.length).toFixed(2)}
              </p>
            )}
            {splitMode === 'custom' && (
              <p className="split-info">
                Total assigned: ${Object.values(customSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpense; 