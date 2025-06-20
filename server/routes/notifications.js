const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   user_id:
 *                     type: integer
 *                   message:
 *                     type: string
 *                   is_read:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Notification not found or access denied
 *       401:
 *         description: Unauthorized
 */
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
