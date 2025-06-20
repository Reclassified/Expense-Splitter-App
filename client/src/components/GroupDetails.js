import React, { useState, useEffect } from 'react';
import api from '../api';
import './Groups.css';

const GroupDetails = ({ group, onBack, onNavigate, onUpdate }) => {
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/groups/${group.id}`);
      setGroupDetails(response.data);
    } catch (err) {
      setError('Failed to fetch group details');
      console.error('Error fetching group details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberUsername.trim()) return;

    try {
      await api.post(`/groups/${group.id}/members`, {
        username: newMemberUsername.trim(),
      });
      setNewMemberUsername('');
      setShowAddMember(false);
      fetchGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/groups/${group.id}/members/${memberId}`);
      fetchGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch(`/groups/${group.id}/members/${memberId}/role`, {
        role: newRole,
      });
      fetchGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const canManageMembers = () => {
    if (!groupDetails) return false;
    const currentMember = groupDetails.members.find(
      (m) => m.user_id === currentUser.id,
    );
    return (
      currentMember &&
      (currentMember.role === 'owner' || currentMember.role === 'admin')
    );
  };

  const canChangeRoles = () => {
    if (!groupDetails) return false;
    const currentMember = groupDetails.members.find(
      (m) => m.user_id === currentUser.id,
    );
    return currentMember && currentMember.role === 'owner';
  };

  if (loading) {
    return <div className="loading">Loading group details...</div>;
  }

  if (error || !groupDetails) {
    return (
      <div className="error-message">
        {error || 'Group could not be loaded.'}
        <button onClick={onBack} className="btn btn-secondary mt-3">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="group-details">
      <div className="group-details-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Groups
        </button>
        <h2>{groupDetails.name}</h2>
        <div className="group-actions">
          <button
            onClick={() => onNavigate('expenses', groupDetails)}
            className="expenses-btn"
          >
            View Expenses
          </button>
          <button
            onClick={() => onNavigate('balances', groupDetails)}
            className="balances-btn"
          >
            View Balances
          </button>
          <button
            onClick={() => onNavigate('recurring-expenses', groupDetails)}
            className="recurring-btn"
          >
            Recurring
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="group-info-section">
        <h3>Group Information</h3>
        <p>
          <strong>Description:</strong>{' '}
          {groupDetails.description || 'No description'}
        </p>
        <p>
          <strong>Created by:</strong> {groupDetails.created_by_username}
        </p>
        <p>
          <strong>Created:</strong>{' '}
          {new Date(groupDetails.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="members-section">
        <div className="members-header">
          <h3>Members ({groupDetails.members.length})</h3>
          {canManageMembers() && (
            <button
              onClick={() => setShowAddMember(true)}
              className="add-member-btn"
            >
              Add Member
            </button>
          )}
        </div>

        {showAddMember && (
          <div className="add-member-form">
            <form onSubmit={handleAddMember}>
              <input
                type="text"
                value={newMemberUsername}
                onChange={(e) => setNewMemberUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
              <button type="submit">Add</button>
              <button type="button" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="members-list">
          {groupDetails.members.map((member) => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <span className="member-name">{member.username}</span>
                <span className={`member-role ${member.role}`}>
                  {member.role}
                </span>
              </div>
              <div className="member-actions">
                {canChangeRoles() && member.user_id !== currentUser.id && (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.user_id, e.target.value)
                    }
                    disabled={member.role === 'owner'}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                )}
                {canManageMembers() &&
                  member.user_id !== currentUser.id &&
                  member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="remove-member-btn"
                    >
                      Remove
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupDetails;
