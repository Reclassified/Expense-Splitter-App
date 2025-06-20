import React, { useState, useEffect } from 'react';
import api from '../api';
import EditExpense from './EditExpense';
import './Expenses.css';

const ExpenseDetails = ({ expense, onBack, onUpdate, onDelete }) => {
  const [expenseDetails, setExpenseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchExpenseDetails();
  }, [expense.id]);

  const fetchExpenseDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/expenses/${expense.id}`);
      setExpenseDetails(response.data);
    } catch (err) {
      setError('Failed to fetch expense details');
      console.error('Error fetching expense details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (expenseData) => {
    try {
      await api.put(`/expenses/${expense.id}`, expenseData);
      setShowEdit(false);
      fetchExpenseDetails();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update expense');
    }
  };

  const canEdit = () => {
    if (!expenseDetails) return false;
    return expenseDetails.paid_by === currentUser.id;
  };

  const canDelete = () => {
    if (!expenseDetails) return false;
    return expenseDetails.paid_by === currentUser.id;
  };

  if (loading) {
    return <div className="loading">Loading expense details...</div>;
  }

  if (!expenseDetails) {
    return <div className="error-message">Failed to load expense details</div>;
  }

  if (showEdit) {
    return (
      <EditExpense 
        expense={expenseDetails}
        onSave={handleEdit}
        onCancel={() => setShowEdit(false)}
      />
    );
  }

  return (
    <div className="expense-details">
      <div className="expense-details-header">
        <button onClick={onBack} className="back-btn">← Back to Expenses</button>
        <div className="expense-actions">
          {canEdit() && (
            <button onClick={() => setShowEdit(true)} className="edit-btn">
              Edit
            </button>
          )}
          {canDelete() && (
            <button onClick={() => onDelete(expense.id)} className="delete-btn">
              Delete
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="expense-info-section">
        <h2>{expenseDetails.title}</h2>
        <div className="expense-amount-large">
          ${parseFloat(expenseDetails.amount).toFixed(2)}
        </div>
        <p className="expense-meta">
          <strong>Paid by:</strong> {expenseDetails.paid_by_username}
        </p>
        <p className="expense-meta">
          <strong>Date:</strong> {new Date(expenseDetails.created_at).toLocaleDateString()}
        </p>
        {expenseDetails.description && (
          <p className="expense-description">
            <strong>Description:</strong> {expenseDetails.description}
          </p>
        )}
      </div>

      <div className="members-section">
        <h3>Split Between Members ({expenseDetails.members.length})</h3>
        <div className="members-list">
          {expenseDetails.members.map(member => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <span className="member-name">{member.username}</span>
                <span className="member-share">${parseFloat(member.share_amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="split-summary">
          <p><strong>Total:</strong> ${parseFloat(expenseDetails.amount).toFixed(2)}</p>
          <p><strong>Per person:</strong> ${(parseFloat(expenseDetails.amount) / expenseDetails.members.length).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetails; 