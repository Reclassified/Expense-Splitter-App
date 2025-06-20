import React, { useState, useEffect } from 'react';
import api from '../api';
import CreateGroup from './CreateGroup';
import './Groups.css';

const Groups = ({ onNavigate }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err) {
      setError('Failed to fetch groups');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [refreshKey]);

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
  };

  const handleGroupCreated = () => {
    setShowCreateGroup(false);
    setRefreshKey((prev) => prev + 1); // Trigger a refresh
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'owner';
      case 'admin':
        return 'admin';
      default:
        return 'member';
    }
  };

  const getUnpaidBalanceBadge = (group) => {
    if (group.has_unpaid_balance) {
      return <span className="badge badge-warning">Unpaid Balance</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="groups-container">
        <div className="loading">Loading groups...</div>
      </div>
    );
  }

  if (showCreateGroup) {
    return <CreateGroup onBack={handleGroupCreated} />;
  }

  return (
    <div className="groups-container">
      <div className="groups-header">
        <div className="header-content">
          <h2>Your Groups</h2>
          <p className="header-subtitle">
            Manage your expense groups and track balances
          </p>
        </div>
        <button onClick={handleCreateGroup} className="btn btn-primary">
          <span>➕</span>
          Create Group
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No Groups Yet</h3>
          <p className="empty-state-description">
            Create your first group to start splitting expenses with friends and
            family.
          </p>
          <button onClick={handleCreateGroup} className="btn btn-primary">
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map((group) => (
            <div
              key={group.id}
              className="group-card"
              onClick={() => onNavigate('group-details', group)}
            >
              <div className="group-main-info">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <div className="group-badges">
                    <span className={`role ${getRoleColor(group.role)}`}>
                      {group.role}
                    </span>
                    {getUnpaidBalanceBadge(group)}
                  </div>
                </div>

                <p className="group-description">
                  {group.description || 'No description provided'}
                </p>

                <div className="group-stats">
                  <div className="stat-item">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">{group.member_count}</span>
                    <span className="stat-label">Members</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">💰</span>
                    <span className="stat-value">{group.expense_count}</span>
                    <span className="stat-label">Expenses</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📅</span>
                    <span className="stat-value">
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                    <span className="stat-label">Created</span>
                  </div>
                </div>
              </div>

              <div className="group-actions">
                <div className="group-arrow">→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {groups.length > 0 && (
        <div className="groups-stats">
          <div className="stats-card">
            <h3>Group Summary</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{groups.length}</span>
                <span className="stat-label">Total Groups</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {groups.reduce((sum, group) => sum + group.member_count, 0)}
                </span>
                <span className="stat-label">Total Members</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {groups.reduce((sum, group) => sum + group.expense_count, 0)}
                </span>
                <span className="stat-label">Total Expenses</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {groups.filter((group) => group.has_unpaid_balance).length}
                </span>
                <span className="stat-label">Groups with Balances</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
