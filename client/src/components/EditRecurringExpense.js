import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css';

const EditRecurringExpense = ({ expense, group, onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    currency: '',
    description: '',
    frequency: '',
    nextDueDate: '',
    endDate: '',
    isActive: true,
  });
  const [paidBy, setPaidBy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description || '',
        frequency: expense.frequency,
        nextDueDate: expense.next_due_date.split('T')[0],
        endDate: expense.end_date ? expense.end_date.split('T')[0] : '',
        isActive: expense.is_active,
      });
      setPaidBy(expense.paid_by);
    }
    api.get(`/groups/${group.id}`).then((res) => {
      // const groupMembers = res.data.members; // Removed unused
    });
  }, [expense, group.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/expenses/recurring/${expense.id}`, {
        ...formData,
        paidBy,
      });
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  return (
    <div className="create-expense-overlay">
      <div className="create-expense-modal">
        <div className="modal-header">
          <h3>Edit Recurring Expense</h3>
          <button onClick={onBack} className="close-btn">
            ×
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          {/* Form fields identical to CreateRecurringExpense, plus an "Is Active" checkbox */}
        </form>
      </div>
    </div>
  );
};

export default EditRecurringExpense;
