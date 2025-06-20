import React, { useState, useEffect } from 'react';
import api from '../api';
import SettleUpModal from './SettleUpModal';
import './Balances.css';

const Balances = ({ group, onBack }) => {
  const [balanceData, setBalanceData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleWithUser, setSettleWithUser] = useState(null);
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, [group.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balancesRes, paymentsRes] = await Promise.all([
        api.get(`/balances/group/${group.id}`),
        api.get(`/payments?groupId=${group.id}`),
      ]);
      setBalanceData(balancesRes.data);
      setPaymentHistory(paymentsRes.data);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleClick = (user) => {
    setSettleWithUser(user);
    setShowSettleModal(true);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  const getBalanceText = (balance) => {
    if (balance > 0) return `+$${balance.toFixed(2)}`;
    if (balance < 0) return `-$${Math.abs(balance).toFixed(2)}`;
    return '$0.00';
  };

  if (loading) {
    return <div className="loading">Calculating balances...</div>;
  }

  if (!balanceData) {
    return <div className="error-message">Failed to load balances</div>;
  }

  if (showSettleModal) {
    return (
      <SettleUpModal 
        group={group}
        currentUser={currentUser}
        debtor={settleWithUser}
        onBack={() => setShowSettleModal(false)}
        onSettled={() => {
          setShowSettleModal(false);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="balances-container">
      <div className="balances-header">
        <button onClick={onBack} className="back-btn">← Back to Group</button>
        <h2>Balances - {group.name}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="summary-section">
        <h3>Group Summary</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Expenses:</span>
            <span className="stat-value">${balanceData.summary.totalExpenses.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Paid:</span>
            <span className="stat-value">${balanceData.summary.totalPaid.toFixed(2)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className={`stat-value ${balanceData.summary.isBalanced ? 'balanced' : 'unbalanced'}`}>
              {balanceData.summary.isBalanced ? 'Balanced' : 'Unbalanced'}
            </span>
          </div>
        </div>
      </div>

      <div className="balances-section">
        <h3>Member Balances</h3>
        <div className="balances-list">
          {balanceData.balances.map(balance => {
            const isCurrentUser = balance.userId === currentUser.id;
            const canSettle = !isCurrentUser && balance.netBalance > 0; // Owed money
            return (
              <div key={balance.userId} className="balance-card">
                <div className="balance-info">
                  <h4>{balance.username}</h4>
                  <div className="balance-details">
                    <p>Paid: ${balance.totalPaid.toFixed(2)}</p>
                    <p>Owed: ${balance.totalOwed.toFixed(2)}</p>
                  </div>
                </div>
                <div className={`balance-amount ${getBalanceColor(balance.netBalance)}`}>
                  {getBalanceText(balance.netBalance)}
                </div>
                {canSettle && (
                  <button onClick={() => handleSettleClick(balance)} className="settle-up-btn">
                    Settle Up
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="payment-history-section">
        <h3>Payment History</h3>
        {paymentHistory.length === 0 ? (
          <p>No payments recorded yet.</p>
        ) : (
          <ul className="payment-history-list">
            {paymentHistory.map(p => (
              <li key={p.id}>
                {p.payer_name} paid {p.payee_name} ${p.amount}
                <span>{new Date(p.payment_date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {balanceData.summary.creditors.length > 0 && (
        <div className="creditors-section">
          <h3>Who's Owed Money</h3>
          <div className="creditors-list">
            {balanceData.summary.creditors.map(creditor => (
              <div key={creditor.userId} className="creditor-item">
                <span className="creditor-name">{creditor.username}</span>
                <span className="creditor-amount positive">+${creditor.netBalance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {balanceData.summary.debtors.length > 0 && (
        <div className="debtors-section">
          <h3>Who Owes Money</h3>
          <div className="debtors-list">
            {balanceData.summary.debtors.map(debtor => (
              <div key={debtor.userId} className="debtor-item">
                <span className="debtor-name">{debtor.username}</span>
                <span className="debtor-amount negative">-${Math.abs(debtor.netBalance).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// User Balance Detail Component
const UserBalance = ({ user, group, onBack }) => {
  const [userBalance, setUserBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUserBalance();
  }, [user.userId, group.id]);

  const fetchUserBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/balances/group/${group.id}/user/${user.userId}`);
      setUserBalance(response.data);
    } catch (err) {
      setError('Failed to fetch user balance');
      console.error('Error fetching user balance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading user balance...</div>;
  }

  if (!userBalance) {
    return <div className="error-message">Failed to load user balance</div>;
  }

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'neutral';
  };

  const getBalanceText = (balance) => {
    if (balance > 0) return `+$${balance.toFixed(2)}`;
    if (balance < 0) return `-$${Math.abs(balance).toFixed(2)}`;
    return '$0.00';
  };

  return (
    <div className="user-balance">
      <div className="user-balance-header">
        <button onClick={onBack} className="back-btn">← Back to Balances</button>
        <h2>{user.username}'s Balance</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="user-summary">
        <div className="user-balance-card">
          <h3>Summary</h3>
          <div className="user-balance-stats">
            <div className="stat-item">
              <span className="stat-label">Total Paid:</span>
              <span className="stat-value">${userBalance.balance.totalPaid.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Owed:</span>
              <span className="stat-value">${userBalance.balance.totalOwed.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Net Balance:</span>
              <span className={`stat-value ${getBalanceColor(userBalance.balance.netBalance)}`}>
                {getBalanceText(userBalance.balance.netBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="user-expenses">
        <h3>Expense History</h3>
        <div className="expenses-list">
          {userBalance.expenses.length === 0 ? (
            <p className="no-expenses">No expenses found for this user.</p>
          ) : (
            userBalance.expenses.map(expense => (
              <div key={expense.expense_id} className="expense-item">
                <div className="expense-info">
                  <h4>{expense.title}</h4>
                  <p className="expense-meta">
                    Paid by {expense.paid_by_username} • {new Date(expense.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="expense-amounts">
                  <span className="expense-total">${expense.amount.toFixed(2)}</span>
                  <span className="expense-share">Your share: ${expense.share_amount.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Balances; 