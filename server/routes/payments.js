const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Record a payment and update balances
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: integer
 *               payeeId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 paymentId:
 *                   type: integer
 *       400:
 *         description: Missing required fields for payment
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to record payment
 */
// Record a payment and update balances
router.post('/', authenticateToken, (req, res) => {
  const { groupId, payeeId, amount, currency, notes } = req.body;
  const payerId = req.user.userId;

  if (!groupId || !payeeId || !amount || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Missing required fields for payment.' });
  }

  try {
    const transaction = db.transaction(() => {
      // 1. Record the payment
      const insertPayment = db.prepare(
        'INSERT INTO payments (group_id, payer_id, payee_id, amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?)',
      );
      const paymentResult = insertPayment.run(
        groupId,
        payerId,
        payeeId,
        amount,
        currency || 'USD',
        notes,
      );

      // 2. Update payer's balance (they paid, so their balance increases towards 0)
      const updatePayer = db.prepare(
        'UPDATE balances SET net_balance = net_balance + ? WHERE user_id = ? AND group_id = ?',
      );
      updatePayer.run(amount, payerId, groupId);

      // 3. Update payee's balance (they received money, so their balance decreases towards 0)
      const updatePayee = db.prepare(
        'UPDATE balances SET net_balance = net_balance - ? WHERE user_id = ? AND group_id = ?',
      );
      updatePayee.run(amount, payeeId, groupId);

      return paymentResult.lastInsertRowid;
    });

    const paymentId = transaction();
    res
      .status(201)
      .json({ message: 'Payment recorded successfully', paymentId });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get payment history for a group
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Group ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Failed to fetch payment history
 */
// Get payment history for a group
router.get('/', authenticateToken, (req, res) => {
  const { groupId } = req.query;
  const userId = req.user.userId;

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is required.' });
  }

  // Check if user is a member of the group
  const memberCheck = db
    .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, userId);
  if (!memberCheck) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const payments = db
      .prepare(
        `
      SELECT 
        p.id, p.amount, p.currency, p.notes, p.payment_date,
        payer.username as payer_name,
        payee.username as payee_name
      FROM payments p
      JOIN users payer ON p.payer_id = payer.id
      JOIN users payee ON p.payee_id = payee.id
      WHERE p.group_id = ?
      ORDER BY p.payment_date DESC
    `,
      )
      .all(groupId);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

module.exports = router;
