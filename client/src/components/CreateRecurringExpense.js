import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css';

const CreateRecurringExpense = ({ group, onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    currency: group.currency || 'USD',
    description: '',
    frequency: 'monthly',
    nextDueDate: '',
    endDate: '',
  });
  const [groupMembers, setGroupMembers] = useState([]);
  const [paidBy, setPaidBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/groups/${group.id}`).then((res) => {
      setGroupMembers(res.data.members);
      setPaidBy(res.data.members[0]?.user_id || '');
    });
  }, [group.id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !paidBy) {
      setError('Title, amount, and who paid are required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/expenses/recurring', {
        ...formData,
        groupId: group.id,
        paidBy,
      });
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
      setLoading(false);
    }
  };

  return (
    <div className="create-expense-overlay">
      <div className="create-expense-modal">
        <div className="modal-header">
          <h3>Create Recurring Expense</h3>
          <button onClick={onBack} className="close-btn">
            ×
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              required
            >
              {groupMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Next Due Date</label>
            <input
              type="date"
              name="nextDueDate"
              value={formData.nextDueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date (Optional)</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRecurringExpense;
