const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Get notifications for the logged-in user
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  try {
    const notifications = db
      .prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      )
      .all(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark a notification as read
router.patch('/:notificationId/read', authenticateToken, (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.userId;
  try {
    const result = db
      .prepare(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      )
      .run(notificationId, userId);
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: 'Notification not found or access denied.' });
    }
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

module.exports = router;
