import React, { useState, useEffect } from 'react';
import api from '../api';
import './Expenses.css';
import ImportExpensesModal from './ImportExpensesModal';

const Expenses = ({ group, onBack, onNavigate }) => {
  const [expenses, setExpenses] = useState([]);
  const [groupData, setGroupData] = useState(group);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    if (!group?.id) return;
    try {
      setLoading(true);
      const [expensesRes, groupRes] = await Promise.all([
        api.get(`/expenses/group/${group.id}`),
        api.get(`/groups/${group.id}`)
      ]);
      setExpenses(expensesRes.data);
      setGroupData(groupRes.data);
    } catch (err) {
      setError('Failed to fetch expense data');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [group?.id]);

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      await api.delete(`/expenses/${expenseId}`);
      fetchData(); // Re-fetch all data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  const canEditExpense = (expense) => {
    const member = groupData?.members.find(m => m.user_id === currentUser?.id);
    return expense.paid_by === currentUser?.id ||
           member?.role === 'owner' ||
           member?.role === 'admin';
  };

  const canDeleteExpense = (expense) => {
    const member = groupData?.members.find(m => m.user_id === currentUser?.id);
    return expense.paid_by === currentUser?.id || member?.role === 'owner';
  };

  const getExpenseStatus = (expense) => {
    if (expense.paid_by === currentUser?.id) {
      // If the user paid, check if they are owed money.
      // This happens if their share is less than the total amount.
      const userShare = expense.members.find(m => m.user_id === currentUser?.id)?.share_amount || 0;
      if (parseFloat(expense.amount) > parseFloat(userShare)) {
        return { type: 'paid', label: 'You Paid', color: 'success' };
      }
    } else {
      // If the user did not pay, check if they owe money.
      const userShare = expense.members.find(m => m.user_id === currentUser?.id)?.share_amount || 0;
      if (parseFloat(userShare) > 0) {
        return { type: 'owed', label: 'You Owe', color: 'warning' };
      }
    }
    return null;
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  const getYourTotalOwed = () => {
    return expenses.reduce((sum, expense) => {
      if (expense.paid_by === currentUser?.id) return sum;
      const userShare = expense.members.find(m => m.user_id === currentUser?.id);
      return sum + (userShare ? parseFloat(userShare.share_amount) : 0);
    }, 0);
  };

  const getYourTotalPaid = () => {
    // This should reflect the total amount of expenses the user has paid for, not their share.
    return expenses.reduce((sum, expense) => {
      if (expense.paid_by === currentUser?.id) {
        return sum + parseFloat(expense.amount);
      }
      return sum;
    }, 0);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/expenses/group/${group.id}/export/csv`, {
        responseType: 'blob', // Important for file downloads
      });
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${group.id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export expenses.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const response = await api.get(`/expenses/group/${group.id}/export/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${group.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export PDF.');
    } finally {
      setExportingPDF(false);
    }
  };

  if (showImportModal) {
    return (
      <ImportExpensesModal
        group={group}
        onBack={() => setShowImportModal(false)}
        onImported={() => {
          setShowImportModal(false);
          fetchData(); // Refresh the expenses list
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="expenses-container">
        <div className="loading">Loading expenses...</div>
      </div>
    );
  }
  
  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <div className="header-content">
          <button onClick={onBack} className="back-btn">← Back to Group</button>
          <h2>Expenses - {groupData?.name}</h2>
          <p className="header-subtitle">
            Track and manage expenses in this group
          </p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary" disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export as CSV'}
        </button>
        <button onClick={handleExportPDF} className="btn btn-secondary" disabled={exportingPDF}>
          {exportingPDF ? 'Exporting...' : 'Export as PDF'}
        </button>
        <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
            Import from CSV
        </button>
        <button onClick={() => onNavigate('create-expense')} className="btn btn-primary">
          <span>➕</span>
          Add Expense
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Expense Summary */}
      {expenses.length > 0 && (
        <div className="expense-summary">
          <div className="summary-card">
            <div className="summary-icon">
              <span>💰</span>
            </div>
            <div className="summary-content">
              <h3>Total Expenses</h3>
              <p className="summary-amount">${getTotalExpenses().toFixed(2)}</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <span>💳</span>
            </div>
            <div className="summary-content">
              <h3>You've Paid</h3>
              <p className="summary-amount">${getYourTotalPaid().toFixed(2)}</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <span>📊</span>
            </div>
            <div className="summary-content">
              <h3>You Owe</h3>
              <p className="summary-amount">${getYourTotalOwed().toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">No Expenses Yet</h3>
          <p className="empty-state-description">
            Start adding expenses to track shared costs in this group.
          </p>
          <button onClick={() => onNavigate('create-expense')} className="btn btn-primary">
            Add Your First Expense
          </button>
        </div>
      ) : (
        <div className="expenses-list">
          {expenses.map(expense => {
            const status = getExpenseStatus(expense);
            return (
              <div key={expense.id} className="expense-card" onClick={() => onNavigate('expense-details', expense)}>
                <div className="expense-main-info">
                  <div className="expense-header">
                    <h3>{expense.title}</h3>
                    <div className="expense-badges">
                      {status && (
                        <span className={`badge badge-${status.color}`}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="expense-description">
                    {expense.description || 'No description'}
                  </p>
                  
                  <div className="expense-meta">
                    <span className="meta-item">
                      <span className="meta-icon">👤</span>
                      {expense.paid_by_username}
                    </span>
                    <span className="meta-item">
                      <span className="meta-icon">👥</span>
                      {expense.members.length} members
                    </span>
                    <span className="meta-item">
                      <span className="meta-icon">📅</span>
                      {new Date(expense.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="expense-actions">
                  <div className="expense-amount">
                    <span className="amount">${parseFloat(expense.amount).toFixed(2)}</span>
                    {status && status.type === 'owed' && (
                      <span className="your-share">
                        Your share: ${expense.members.find(m => m.user_id === currentUser?.id)?.share_amount || '0.00'}
                      </span>
                    )}
                  </div>
                  <div className="action-buttons">
                    {canEditExpense(expense) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('edit-expense', expense);
                        }} 
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                    )}
                    {canDeleteExpense(expense) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpense(expense.id);
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Expenses; 