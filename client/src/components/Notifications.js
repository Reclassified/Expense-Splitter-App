import React, { useState, useEffect } from 'react';
import api from '../api';

const Notifications = ({ onNavigate, onMarkAsRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      onMarkAsRead(); // Update parent state
      fetchNotifications(); // Refresh list
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div className="notifications-dropdown">
      {notifications.length === 0 ? (
        <div className="notification-item">No new notifications.</div>
      ) : (
        notifications.map(n => (
          <div key={n.id} className={`notification-item ${n.is_read ? 'read' : ''}`}>
            <p>{n.message}</p>
            {!n.is_read && (
              <button onClick={() => handleMarkAsRead(n.id)}>Mark as Read</button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications; 