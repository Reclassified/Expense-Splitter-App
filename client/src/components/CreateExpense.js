import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css';

const CreateExpense = ({ group, onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' or 'custom'
  const [customSplits, setCustomSplits] = useState({});

  useEffect(() => {
    fetchGroupMembers();
  }, [fetchGroupMembers]);

  const fetchGroupMembers = async () => {
    try {
      const response = await api.get(`/groups/${group.id}`);
      setGroupMembers(response.data.members);
      // Initialize custom splits
      const initialSplits = {};
      response.data.members.forEach((member) => {
        initialSplits[member.user_id] = '';
      });
      setCustomSplits(initialSplits);
    } catch (err) {
      setError('Failed to fetch group members');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleCustomSplitChange = (memberId, value) => {
    setCustomSplits((prev) => ({ ...prev, [memberId]: value }));
  };

  const validateCustomSplits = () => {
    if (splitMode !== 'custom') return true;
    const total = Object.values(customSplits).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0,
    );
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
        groupId: group.id,
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        memberIds: selectedMembers,
        splits:
          splitMode === 'custom'
            ? selectedMembers.map((id) => ({
                userId: id,
                amount: parseFloat(customSplits[id]),
              }))
            : null,
      };

      await api.post('/expenses', expenseData);
      onBack(); // Go back to the expenses list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-expense-overlay">
      <div className="create-expense-modal">
        <div className="modal-header">
          <h3>Add New Expense</h3>
          <button onClick={onBack} className="close-btn">
            ×
          </button>
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
              <button
                type="button"
                className={splitMode === 'equal' ? 'active' : ''}
                onClick={() => setSplitMode('equal')}
              >
                Equal
              </button>
              <button
                type="button"
                className={splitMode === 'custom' ? 'active' : ''}
                onClick={() => setSplitMode('custom')}
              >
                Custom
              </button>
            </div>
            <div className="members-selection">
              {groupMembers.map((member) => (
                <div key={member.user_id} className="member-item">
                  <label className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.user_id)}
                      onChange={() => handleMemberToggle(member.user_id)}
                    />
                    <span className="member-name">{member.username}</span>
                  </label>
                  {splitMode === 'custom' &&
                    selectedMembers.includes(member.user_id) && (
                      <input
                        type="number"
                        className="split-input"
                        value={customSplits[member.user_id]}
                        onChange={(e) =>
                          handleCustomSplitChange(
                            member.user_id,
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                        step="0.01"
                      />
                    )}
                </div>
              ))}
            </div>
            {splitMode === 'equal' && selectedMembers.length > 0 && (
              <p className="split-info">
                Each member will pay: $
                {(
                  parseFloat(formData.amount || 0) / selectedMembers.length
                ).toFixed(2)}
              </p>
            )}
            {splitMode === 'custom' && (
              <p className="split-info">
                Total assigned: $
                {Object.values(customSplits)
                  .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
                  .toFixed(2)}
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onBack} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="create-btn">
              {loading ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExpense;
