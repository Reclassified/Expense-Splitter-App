import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css'; // Can reuse styles

const RecurringExpenses = ({ group, onBack, onNavigate }) => {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecurringExpenses();
  }, [fetchRecurringExpenses]);

  const fetchRecurringExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/expenses/recurring?groupId=${group.id}`);
      setRecurringExpenses(response.data);
    } catch (err) {
      setError('Failed to fetch recurring expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm('Are you sure you want to delete this recurring expense?')
    )
      return;
    try {
      await api.delete(`/expenses/recurring/${id}`);
      fetchRecurringExpenses();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  if (loading)
    return <div className="loading">Loading recurring expenses...</div>;

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Group
        </button>
        <h2>Recurring Expenses - {group.name}</h2>
        <button
          onClick={() => onNavigate('create-recurring-expense', group)}
          className="btn btn-primary"
        >
          Add Recurring
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {recurringExpenses.length === 0 ? (
        <div className="empty-state">No recurring expenses found.</div>
      ) : (
        <div className="expenses-list">
          {recurringExpenses.map((item) => (
            <div key={item.id} className="expense-card">
              <h3>{item.title}</h3>
              <p>
                Amount: ${item.amount} ({item.currency})
              </p>
              <p>Frequency: {item.frequency}</p>
              <p>
                Next due: {new Date(item.next_due_date).toLocaleDateString()}
              </p>
              <div>
                <button
                  onClick={() => onNavigate('edit-recurring-expense', item)}
                  className="btn btn-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringExpenses;
