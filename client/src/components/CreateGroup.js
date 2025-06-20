import React, { useState, useEffect } from 'react';
import api from '../api';
import './Groups.css';

const CreateGroup = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD',
  });
  const [supportedCurrencies, setSupportedCurrencies] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/currency/supported').then((res) => {
      setSupportedCurrencies(res.data);
    });
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      await api.post('/groups', formData);
      onBack(); // Go back to the groups list on success
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group');
    }
  };

  return (
    <div className="create-group-overlay">
      <div className="create-group-modal">
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button onClick={onBack} className="close-btn">
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="groupName">Group Name *</label>
            <input
              type="text"
              id="groupName"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupDescription">Description</label>
            <textarea
              id="groupDescription"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter group description (optional)"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupCurrency">Currency *</label>
            <select
              id="groupCurrency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              required
            >
              {supportedCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onBack} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="create-btn">
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
