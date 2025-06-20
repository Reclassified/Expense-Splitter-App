const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');
const Papa = require('papaparse');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temp storage for uploads
const PDFDocument = require('pdfkit');

const router = express.Router();

function calculateBalances(groupMembers, expenses, expenseMembers) {
  const balances = {};
  groupMembers.forEach((member) => {
    balances[member.user_id] = 0;
  });

  expenses.forEach((expense) => {
    if (balances[expense.paid_by] !== undefined) {
      balances[expense.paid_by] += expense.amount;
    }
  });

  expenseMembers.forEach((member) => {
    if (balances[member.user_id] !== undefined) {
      balances[member.user_id] -= member.share_amount;
    }
  });

  return balances;
}

function updateBalancesInDb(groupId, balances) {
  const updateStmt = db.prepare(
    'INSERT INTO balances (group_id, user_id, net_balance) VALUES (?, ?, ?) ON CONFLICT(group_id, user_id) DO UPDATE SET net_balance = excluded.net_balance, updated_at = CURRENT_TIMESTAMP',
  );
  db.transaction(() => {
    for (const userId in balances) {
      updateStmt.run(groupId, userId, balances[userId]);
    }
  })();
}

// Get recent expenses for the logged-in user (across all groups)
router.get('/recent', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    // Get the 10 most recent expenses from groups the user is a member of
    const expensesRaw = db
      .prepare(
        `
      SELECT 
        e.*, 
        u.username as paid_by_username, 
        g.name as group_name
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      JOIN groups g ON e.group_id = g.id
      WHERE e.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
      ORDER BY e.created_at DESC
      LIMIT 10
    `,
      )
      .all(userId);

    // For each expense, get the members
    const expenses = expensesRaw.map((expense) => {
      const members = db
        .prepare(
          `
        SELECT u.id as user_id, u.username, em.share_amount
        FROM expense_members em
        JOIN users u ON em.user_id = u.id
        WHERE em.expense_id = ?
      `,
        )
        .all(expense.id);
      return { ...expense, members };
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching recent expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all expenses for a group
router.get('/group/:groupId', authenticateToken, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get expenses with payer and member information
    const expensesRaw = db
      .prepare(
        `
      SELECT 
        e.*,
        u.username as paid_by_username,
        COUNT(em.user_id) as member_count
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      LEFT JOIN expense_members em ON e.id = em.expense_id
      WHERE e.group_id = ?
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `,
      )
      .all(groupId);

    // For each expense, get the members
    const expenses = expensesRaw.map((expense) => {
      const members = db
        .prepare(
          `
        SELECT u.id as user_id, u.username, em.share_amount
        FROM expense_members em
        JOIN users u ON em.user_id = u.id
        WHERE em.expense_id = ?
      `,
        )
        .all(expense.id);
      return { ...expense, members };
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expense details by ID
router.get('/:expenseId', authenticateToken, (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.userId;

    // Get expense with payer info
    const expense = db
      .prepare(
        `
      SELECT e.*, u.username as paid_by_username, g.name as group_name
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      JOIN groups g ON e.group_id = g.id
      WHERE e.id = ?
    `,
      )
      .get(expenseId);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(expense.group_id, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get expense members
    const members = db
      .prepare(
        `
      SELECT em.*, u.username
      FROM expense_members em
      JOIN users u ON em.user_id = u.id
      WHERE em.expense_id = ?
      ORDER BY u.username
    `,
      )
      .all(expenseId);

    res.json({ ...expense, members });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new expense
router.post('/', authenticateToken, (req, res) => {
  try {
    const { groupId, title, amount, description, memberIds, splits } = req.body;
    const userId = req.user.userId;

    // Validation
    if (
      !groupId ||
      !title ||
      !amount ||
      !memberIds ||
      !Array.isArray(memberIds)
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (memberIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one member must be selected' });
    }

    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if all memberIds are valid group members
    const groupMembers = db
      .prepare('SELECT user_id FROM group_members WHERE group_id = ?')
      .all(groupId)
      .map((m) => m.user_id);

    for (const memberId of memberIds) {
      if (!groupMembers.includes(memberId)) {
        return res.status(400).json({ error: 'Invalid member selected' });
      }
    }

    // Validate splits if provided
    let splitMap = {};
    if (splits && Array.isArray(splits)) {
      let sum = 0;
      for (const split of splits) {
        if (!memberIds.includes(split.userId)) {
          return res
            .status(400)
            .json({ error: 'Split includes invalid member' });
        }
        sum += Number(split.amount);
        splitMap[split.userId] = Number(split.amount);
      }
      if (Math.abs(sum - amount) > 0.01) {
        return res
          .status(400)
          .json({ error: 'Sum of splits must equal total amount' });
      }
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Insert expense
      const insertExpense = db.prepare(
        'INSERT INTO expenses (group_id, title, amount, paid_by, description) VALUES (?, ?, ?, ?, ?)',
      );
      const result = insertExpense.run(
        groupId,
        title.trim(),
        amount,
        userId,
        description?.trim() || null,
      );

      const expenseId = result.lastInsertRowid;

      // Insert expense members
      const insertMember = db.prepare(
        'INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
      );
      for (const memberId of memberIds) {
        let shareAmount =
          splits && Array.isArray(splits)
            ? splitMap[memberId]
            : amount / memberIds.length;
        insertMember.run(expenseId, memberId, shareAmount);
      }

      return expenseId;
    });

    const expenseId = transaction();

    // Get the created expense with details
    const expense = db
      .prepare(
        `
      SELECT 
        e.*,
        u.username as paid_by_username,
        COUNT(em.user_id) as member_count
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      LEFT JOIN expense_members em ON e.id = em.expense_id
      WHERE e.id = ?
      GROUP BY e.id
    `,
      )
      .get(expenseId);

    // Calculate balances
    const expenses = db
      .prepare(
        `
      SELECT id, amount, paid_by
      FROM expenses
      WHERE group_id = ?
    `,
      )
      .all(groupId);
    const expenseMembers = db
      .prepare(
        `
      SELECT expense_id, user_id, share_amount
      FROM expense_members
      WHERE expense_id IN (
        SELECT id FROM expenses WHERE group_id = ?
      )
    `,
      )
      .all(groupId);
    const balances = calculateBalances(
      db
        .prepare('SELECT user_id FROM group_members WHERE group_id = ?')
        .all(groupId),
      expenses,
      expenseMembers,
    );
    updateBalancesInDb(groupId, balances);

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update expense
router.put('/:expenseId', authenticateToken, (req, res) => {
  try {
    const { expenseId } = req.params;
    const { title, amount, description, memberIds, splits } = req.body;
    const userId = req.user.userId;

    // Get expense
    const expense = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(expenseId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(expense.group_id, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only expense creator or group admin/owner can edit
    const canEdit =
      expense.paid_by === userId ||
      memberCheck.role === 'owner' ||
      memberCheck.role === 'admin';
    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validation
    if (!title || !amount || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (memberIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one member must be selected' });
    }

    // Check if all memberIds are valid group members
    const groupMembers = db
      .prepare('SELECT user_id FROM group_members WHERE group_id = ?')
      .all(expense.group_id)
      .map((m) => m.user_id);

    for (const memberId of memberIds) {
      if (!groupMembers.includes(memberId)) {
        return res.status(400).json({ error: 'Invalid member selected' });
      }
    }

    // Validate splits if provided
    let splitMap = {};
    if (splits && Array.isArray(splits)) {
      let sum = 0;
      for (const split of splits) {
        if (!memberIds.includes(split.userId)) {
          return res
            .status(400)
            .json({ error: 'Split includes invalid member' });
        }
        sum += Number(split.amount);
        splitMap[split.userId] = Number(split.amount);
      }
      if (Math.abs(sum - amount) > 0.01) {
        return res
          .status(400)
          .json({ error: 'Sum of splits must equal total amount' });
      }
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Update expense
      const updateExpense = db.prepare(
        'UPDATE expenses SET title = ?, amount = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      );
      updateExpense.run(
        title.trim(),
        amount,
        description?.trim() || null,
        expenseId,
      );

      // Remove existing members
      const deleteMembers = db.prepare(
        'DELETE FROM expense_members WHERE expense_id = ?',
      );
      deleteMembers.run(expenseId);

      // Insert new members
      const insertMember = db.prepare(
        'INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
      );
      for (const memberId of memberIds) {
        let shareAmount =
          splits && Array.isArray(splits)
            ? splitMap[memberId]
            : amount / memberIds.length;
        insertMember.run(expenseId, memberId, shareAmount);
      }
    });

    transaction();

    // Get updated expense
    const updatedExpense = db
      .prepare(
        `
      SELECT 
        e.*,
        u.username as paid_by_username,
        COUNT(em.user_id) as member_count
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      LEFT JOIN expense_members em ON e.id = em.expense_id
      WHERE e.id = ?
      GROUP BY e.id
    `,
      )
      .get(expenseId);

    // Calculate balances
    const expenses = db
      .prepare(
        `
      SELECT id, amount, paid_by
      FROM expenses
      WHERE group_id = ?
    `,
      )
      .all(expense.group_id);
    const expenseMembers = db
      .prepare(
        `
      SELECT expense_id, user_id, share_amount
      FROM expense_members
      WHERE expense_id IN (
        SELECT id FROM expenses WHERE group_id = ?
      )
    `,
      )
      .all(expense.group_id);
    const balances = calculateBalances(
      db
        .prepare('SELECT user_id FROM group_members WHERE group_id = ?')
        .all(expense.group_id),
      expenses,
      expenseMembers,
    );
    updateBalancesInDb(expense.group_id, balances);

    res.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expense
router.delete('/:expenseId', authenticateToken, (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.userId;

    // Get expense
    const expense = db
      .prepare('SELECT * FROM expenses WHERE id = ?')
      .get(expenseId);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(expense.group_id, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only expense creator or group owner can delete
    const canDelete =
      expense.paid_by === userId || memberCheck.role === 'owner';
    if (!canDelete) {
      return res
        .status(403)
        .json({ error: 'Insufficient permissions to delete' });
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Delete expense members first
      const deleteMembers = db.prepare(
        'DELETE FROM expense_members WHERE expense_id = ?',
      );
      deleteMembers.run(expenseId);

      // Delete expense
      const deleteExpense = db.prepare('DELETE FROM expenses WHERE id = ?');
      deleteExpense.run(expenseId);
    });

    transaction();

    // Calculate balances
    const expenses = db
      .prepare(
        `
      SELECT id, amount, paid_by
      FROM expenses
      WHERE group_id = ?
    `,
      )
      .all(expense.group_id);
    const expenseMembers = db
      .prepare(
        `
      SELECT expense_id, user_id, share_amount
      FROM expense_members
      WHERE expense_id IN (
        SELECT id FROM expenses WHERE group_id = ?
      )
    `,
      )
      .all(expense.group_id);
    const balances = calculateBalances(
      db
        .prepare('SELECT user_id FROM group_members WHERE group_id = ?')
        .all(expense.group_id),
      expenses,
      expenseMembers,
    );
    updateBalancesInDb(expense.group_id, balances);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin password reset (for development/testing)
router.post('/reset-password', async (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res
      .status(400)
      .json({ error: 'Username and new password required' });
  }
  try {
    const saltRounds = 10;
    const hashedPassword = await require('bcryptjs').hash(
      newPassword,
      saltRounds,
    );
    const result = db
      .prepare('UPDATE users SET password = ? WHERE username = ?')
      .run(hashedPassword, username);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recurring Expenses Endpoints

// Create recurring expense
router.post('/recurring', authenticateToken, (req, res) => {
  try {
    const {
      groupId,
      title,
      amount,
      currency,
      paidBy,
      description,
      frequency,
      nextDueDate,
      endDate,
    } = req.body;
    const userId = req.user.userId;
    if (
      !groupId ||
      !title ||
      !amount ||
      !currency ||
      !paidBy ||
      !frequency ||
      !nextDueDate
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // Only owner/admin can create recurring expenses
    if (!(memberCheck.role === 'owner' || memberCheck.role === 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only owner or admin can create recurring expenses' });
    }
    const insert = db.prepare(`
      INSERT INTO recurring_expenses (group_id, title, amount, currency, paid_by, description, frequency, next_due_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insert.run(
      groupId,
      title.trim(),
      amount,
      currency,
      paidBy,
      description?.trim() || null,
      frequency,
      nextDueDate,
      endDate || null,
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all recurring expenses for a group
router.get('/recurring', authenticateToken, (req, res) => {
  try {
    const { groupId } = req.query;
    const userId = req.user.userId;
    if (!groupId) return res.status(400).json({ error: 'groupId required' });
    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);
    if (!memberCheck) return res.status(403).json({ error: 'Access denied' });
    const recurs = db
      .prepare(
        'SELECT * FROM recurring_expenses WHERE group_id = ? AND is_active = 1',
      )
      .all(groupId);
    res.json(recurs);
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single recurring expense
router.get('/recurring/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const recur = db
      .prepare('SELECT * FROM recurring_expenses WHERE id = ?')
      .get(id);
    if (!recur) return res.status(404).json({ error: 'Not found' });
    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(recur.group_id, userId);
    if (!memberCheck) return res.status(403).json({ error: 'Access denied' });
    res.json(recur);
  } catch (error) {
    console.error('Error fetching recurring expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update recurring expense
router.put('/recurring/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      amount,
      currency,
      paidBy,
      description,
      frequency,
      nextDueDate,
      endDate,
      isActive,
    } = req.body;
    const userId = req.user.userId;
    const recur = db
      .prepare('SELECT * FROM recurring_expenses WHERE id = ?')
      .get(id);
    if (!recur) return res.status(404).json({ error: 'Not found' });
    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(recur.group_id, userId);
    if (!memberCheck) return res.status(403).json({ error: 'Access denied' });
    // Only owner/admin can update
    if (!(memberCheck.role === 'owner' || memberCheck.role === 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only owner or admin can update recurring expenses' });
    }
    const update = db.prepare(`
      UPDATE recurring_expenses SET title = ?, amount = ?, currency = ?, paid_by = ?, description = ?, frequency = ?, next_due_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    update.run(
      title,
      amount,
      currency,
      paidBy,
      description,
      frequency,
      nextDueDate,
      endDate,
      isActive ? 1 : 0,
      id,
    );
    res.json({ message: 'Updated' });
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete recurring expense
router.delete('/recurring/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const recur = db
      .prepare('SELECT * FROM recurring_expenses WHERE id = ?')
      .get(id);
    if (!recur) return res.status(404).json({ error: 'Not found' });
    // Check if user is member of the group
    const memberCheck = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(recur.group_id, userId);
    if (!memberCheck) return res.status(403).json({ error: 'Access denied' });
    // Only owner/admin can delete
    if (!(memberCheck.role === 'owner' || memberCheck.role === 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only owner or admin can delete recurring expenses' });
    }
    db.prepare('DELETE FROM recurring_expenses WHERE id = ?').run(id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export expenses to CSV
router.get('/group/:groupId/export/csv', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  // Check if user is a member of the group
  const memberCheck = db
    .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, userId);
  if (!memberCheck) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const expenses = db
      .prepare(
        `
            SELECT 
                e.title, e.amount, e.currency, e.description,
                u.username as paid_by,
                e.created_at,
                (SELECT GROUP_CONCAT(u_inner.username) 
                 FROM expense_members em_inner 
                 JOIN users u_inner ON em_inner.user_id = u_inner.id 
                 WHERE em_inner.expense_id = e.id) as members
            FROM expenses e
            JOIN users u ON e.paid_by = u.id
            WHERE e.group_id = ?
            ORDER BY e.created_at DESC
        `,
      )
      .all(groupId);

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'No expenses to export.' });
    }

    const csv = Papa.unparse(expenses);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export data.' });
  }
});

// Import expenses from CSV
router.post(
  '/group/:groupId/import/csv',
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;

    // Check if user is a member of the group and has permission (e.g., admin/owner)
    const memberCheck = db
      .prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      )
      .get(groupId, userId);
    if (
      !memberCheck ||
      (memberCheck.role !== 'owner' && memberCheck.role !== 'admin')
    ) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to import expenses.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileContent = require('fs').readFileSync(req.file.path, 'utf8');

    try {
      const groupMembers = db
        .prepare(
          'SELECT user_id, username FROM group_members WHERE group_id = ?',
        )
        .all(groupId);
      const groupMemberUsernames = groupMembers.reduce((acc, member) => {
        acc[member.username] = member.user_id;
        return acc;
      }, {});

      const result = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      const expensesToCreate = result.data;
      let successfulImports = 0;
      const errors = [];

      const transaction = db.transaction(() => {
        for (const [index, expense] of expensesToCreate.entries()) {
          const { title, amount, paid_by, members } = expense;
          if (!title || !amount || !paid_by || !members) {
            errors.push(`Row ${index + 2}: Missing required fields.`);
            continue;
          }

          const paidByUserId = groupMemberUsernames[paid_by];
          if (!paidByUserId) {
            errors.push(
              `Row ${index + 2}: Payer "${paid_by}" is not in this group.`,
            );
            continue;
          }

          const memberUsernames = members.split(',').map((m) => m.trim());
          const memberUserIds = memberUsernames.map(
            (username) => groupMemberUsernames[username],
          );

          if (memberUserIds.some((id) => id === undefined)) {
            errors.push(
              `Row ${index + 2}: One or more members in "${members}" are not in this group.`,
            );
            continue;
          }

          // Create expense
          const insertExpense = db.prepare(
            'INSERT INTO expenses (group_id, title, amount, paid_by, description) VALUES (?, ?, ?, ?, ?)',
          );
          const expenseResult = insertExpense.run(
            groupId,
            title,
            amount,
            paidByUserId,
            expense.description || '',
          );
          const expenseId = expenseResult.lastInsertRowid;

          // Add expense members (equal split for simplicity)
          const shareAmount = amount / memberUserIds.length;
          const insertMember = db.prepare(
            'INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES (?, ?, ?)',
          );
          for (const memberId of memberUserIds) {
            insertMember.run(expenseId, memberId, shareAmount);
          }
          successfulImports++;
        }
      });

      transaction();

      res.status(200).json({
        message: 'Import process completed.',
        successfulImports,
        errors,
      });
    } catch (error) {
      console.error('Error importing CSV:', error);
      res.status(500).json({ error: 'Failed to import data.' });
    } finally {
      require('fs').unlinkSync(req.file.path); // Clean up temp file
    }
  },
);

// Export expenses to PDF
router.get('/group/:groupId/export/pdf', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.userId;

  // Check if user is a member of the group
  const memberCheck = db
    .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, userId);
  if (!memberCheck) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const group = db
      .prepare('SELECT name FROM groups WHERE id = ?')
      .get(groupId);
    const expenses = db
      .prepare(
        `
            SELECT 
                e.title, e.amount, e.currency, e.description,
                u.username as paid_by,
                e.created_at
            FROM expenses e
            JOIN users u ON e.paid_by = u.id
            WHERE e.group_id = ?
            ORDER BY e.created_at DESC
        `,
      )
      .all(groupId);

    if (expenses.length === 0) {
      return res.status(404).json({ error: 'No expenses to export.' });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=expenses-${groupId}.pdf`,
    );
    doc.pipe(res);

    // Add content to the PDF
    doc
      .fontSize(20)
      .text(`Expense Report for ${group.name}`, { align: 'center' });
    doc.moveDown();

    expenses.forEach((expense) => {
      doc.fontSize(14).text(expense.title, { continued: true });
      doc
        .fontSize(14)
        .text(` - ${expense.amount} ${expense.currency}`, { align: 'right' });
      doc
        .fontSize(10)
        .text(
          `Paid by ${expense.paid_by} on ${new Date(expense.created_at).toLocaleDateString()}`,
        );
      if (expense.description) {
        doc.fontSize(10).text(expense.description);
      }
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export data as PDF.' });
  }
});

module.exports = router;
