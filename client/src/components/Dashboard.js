import React, { useState, useEffect } from 'react';
import api from '../api';
import './Dashboard.css';

const Dashboard = ({ onNavigate, refreshKey }) => {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    setUser(currentUser);
    if (currentUser) {
      fetchDashboardData();
    } else {
      setLoading(false);
      setError('No user found, please log in again.');
    }
  }, [refreshKey]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [groupsRes, expensesRes, balanceSummaryRes] = await Promise.all([
        api.get('/groups'),
        api.get('/expenses/recent'),
        api.get('/balances/summary'),
      ]);

      setGroups(groupsRes.data);
      setRecentExpenses(expensesRes.data);
      setBalanceSummary(balanceSummaryRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBalanceColor = (balance) => {
    const num = parseFloat(balance);
    if (num > 0) return 'positive';
    if (num < 0) return 'negative';
    return 'neutral';
  };

  const getBalanceText = (balance) => {
    const num = parseFloat(balance);
    if (num > 0) return `+$${num.toFixed(2)}`;
    if (num < 0) return `-$${Math.abs(num).toFixed(2)}`;
    return '$0.00';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onNavigate('login');
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="welcome-text">
            <h1>Welcome back, {user?.username}!</h1>
            <p>Here's what's happening with your expenses</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Balance Summary Cards */}
      <div className="balance-summary">
        <div className="summary-card">
          <div className="summary-icon positive">
            <span>💰</span>
          </div>
          <div className="summary-content">
            <h3>You're Owed</h3>
            <p
              className={`summary-amount ${getBalanceColor(balanceSummary.totalOwedToYou)}`}
            >
              ${balanceSummary.totalOwedToYou}
            </p>
            {parseFloat(balanceSummary.totalOwedToYou) > 0 && (
              <span className="badge badge-success">Pending Collection</span>
            )}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon negative">
            <span>💳</span>
          </div>
          <div className="summary-content">
            <h3>You Owe</h3>
            <p
              className={`summary-amount ${getBalanceColor(-balanceSummary.totalOwed)}`}
            >
              ${balanceSummary.totalOwed}
            </p>
            {parseFloat(balanceSummary.totalOwed) > 0 && (
              <span className="badge badge-warning">Payment Due</span>
            )}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon neutral">
            <span>⚖️</span>
          </div>
          <div className="summary-content">
            <h3>Net Balance</h3>
            <p
              className={`summary-amount ${getBalanceColor(balanceSummary.netBalance)}`}
            >
              {getBalanceText(balanceSummary.netBalance)}
            </p>
            {parseFloat(balanceSummary.netBalance) !== 0 && (
              <span
                className={`badge ${parseFloat(balanceSummary.netBalance) > 0 ? 'badge-success' : 'badge-danger'}`}
              >
                {parseFloat(balanceSummary.netBalance) > 0
                  ? 'In Credit'
                  : 'In Debt'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button
            onClick={() => onNavigate('groups')}
            className="btn btn-primary"
          >
            <span>👥</span>
            Manage Groups
          </button>
          <button
            onClick={() => onNavigate('create-group')}
            className="btn btn-success"
          >
            <span>➕</span>
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Overview */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Your Groups</h2>
          <button
            onClick={() => onNavigate('groups')}
            className="btn btn-secondary"
          >
            View All
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3 className="empty-state-title">No Groups Yet</h3>
            <p className="empty-state-description">
              Create your first group to start splitting expenses with friends
              and family.
            </p>
            <button
              onClick={() => onNavigate('create-group')}
              className="btn btn-primary"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.slice(0, 3).map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => onNavigate('group-details', group)}
              >
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <span className={`role ${group.role}`}>{group.role}</span>
                </div>
                <p className="group-description">
                  {group.description || 'No description'}
                </p>
                <div className="group-meta">
                  <span>{group.member_count} members</span>
                  <span>•</span>
                  <span>{group.expense_count} expenses</span>
                </div>
                {group.has_unpaid_balance && (
                  <div className="unpaid-badge">
                    <span className="badge badge-warning">Unpaid Balance</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Expenses</h2>
          <button
            onClick={() => onNavigate('expenses')}
            className="btn btn-secondary"
          >
            View All
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3 className="empty-state-title">No Expenses Yet</h3>
            <p className="empty-state-description">
              Start adding expenses to your groups to see them here.
            </p>
          </div>
        ) : (
          <div className="expenses-list">
            {recentExpenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <h4>{expense.title}</h4>
                  <p className="expense-meta">
                    {expense.group_name} • {expense.paid_by_username} •{' '}
                    {new Date(expense.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="expense-amount">
                  <span className="amount">
                    ${parseFloat(expense.amount).toFixed(2)}
                  </span>
                  {expense.paid_by === user?.id && (
                    <span className="badge badge-success">You Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
