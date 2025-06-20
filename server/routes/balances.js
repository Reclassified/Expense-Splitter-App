const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Get balances for a group
router.get('/group/:groupId', authenticateToken, (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;
    
    // Check if user is member of the group
    const memberCheck = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all group members
    const members = db.prepare(`
      SELECT gm.user_id, u.username
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY u.username
    `).all(groupId);
    
    // Get all expenses for the group
    const expenses = db.prepare(`
      SELECT e.*, u.username as paid_by_username
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = ?
      ORDER BY e.created_at
    `).all(groupId);
    
    // Get all expense members (who is involved in each expense)
    const expenseMembers = db.prepare(`
      SELECT em.*, e.title as expense_title, e.amount as expense_amount
      FROM expense_members em
      JOIN expenses e ON em.expense_id = e.id
      WHERE e.group_id = ?
    `).all(groupId);
    
    // Calculate balances
    const balances = calculateBalances(members, expenses, expenseMembers);
    
    // Store/update balances in the database
    updateBalancesInDb(groupId, balances);
    
    res.json({
      groupId: parseInt(groupId),
      members: members,
      expenses: expenses,
      balances: balances,
      summary: calculateSummary(balances)
    });
  } catch (error) {
    console.error('Error calculating balances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get balances for a specific user in a group
router.get('/group/:groupId/user/:userId', authenticateToken, (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user.userId;
    
    // Check if current user is member of the group
    const memberCheck = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, currentUserId);
    if (!memberCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if target user is member of the group
    const targetMemberCheck = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
    if (!targetMemberCheck) {
      return res.status(404).json({ error: 'User not found in group' });
    }
    
    // Get user's expenses and shares
    const userExpenses = db.prepare(`
      SELECT 
        e.id as expense_id,
        e.title,
        e.amount,
        e.paid_by,
        u.username as paid_by_username,
        em.share_amount,
        e.created_at
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      JOIN expense_members em ON e.id = em.expense_id
      WHERE e.group_id = ? AND em.user_id = ?
      ORDER BY e.created_at DESC
    `).all(groupId, userId);
    
    // Calculate user's balance
    const balance = calculateUserBalance(userExpenses, parseInt(userId));
    
    res.json({
      userId: parseInt(userId),
      groupId: parseInt(groupId),
      expenses: userExpenses,
      balance: balance
    });
  } catch (error) {
    console.error('Error calculating user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a summary of the current user's balances across all groups
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN net_balance > 0 THEN net_balance ELSE 0 END), 0) as total_owed_to_you,
        COALESCE(SUM(CASE WHEN net_balance < 0 THEN net_balance ELSE 0 END), 0) as total_you_owe
      FROM balances
      WHERE user_id = ?
    `).get(userId);

    const netBalance = summary.total_owed_to_you + summary.total_you_owe;

    res.json({
      totalOwedToYou: summary.total_owed_to_you.toFixed(2),
      totalOwed: Math.abs(summary.total_you_owe).toFixed(2),
      netBalance: netBalance.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching balance summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate balances for all members
function calculateBalances(members, expenses, expenseMembers) {
  const balances = {};
  
  // Initialize balances for all members
  members.forEach(member => {
    balances[member.user_id] = {
      userId: member.user_id,
      username: member.username,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
      expenses: []
    };
  });
  
  // Calculate what each person paid and owes
  expenses.forEach(expense => {
    const expenseMembersForExpense = expenseMembers.filter(em => em.expense_id === expense.id);
    
    // Add what the payer paid
    balances[expense.paid_by].totalPaid += parseFloat(expense.amount);
    
    // Add what each member owes
    expenseMembersForExpense.forEach(em => {
      balances[em.user_id].totalOwed += parseFloat(em.share_amount);
      
      // Add expense details to user's expense list
      balances[em.user_id].expenses.push({
        expenseId: expense.id,
        title: expense.title,
        amount: parseFloat(expense.amount),
        shareAmount: parseFloat(em.share_amount),
        paidBy: expense.paid_by_username,
        date: expense.created_at
      });
    });
  });
  
  // Calculate net balance for each person
  Object.values(balances).forEach(balance => {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
  });
  
  return Object.values(balances);
}

// Helper function to calculate summary statistics
function calculateSummary(balances) {
  const totalExpenses = balances.reduce((sum, balance) => sum + balance.totalOwed, 0);
  const totalPaid = balances.reduce((sum, balance) => sum + balance.totalPaid, 0);
  
  const creditors = balances.filter(b => b.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
  const debtors = balances.filter(b => b.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);
  
  return {
    totalExpenses: totalExpenses,
    totalPaid: totalPaid,
    creditors: creditors,
    debtors: debtors,
    isBalanced: Math.abs(totalExpenses - totalPaid) < 0.01 // Account for floating point precision
  };
}

// Helper function to calculate balance for a specific user
function calculateUserBalance(userExpenses, userId) {
  let totalPaid = 0;
  let totalOwed = 0;
  
  userExpenses.forEach(expense => {
    if (expense.paid_by === userId) {
      totalPaid += parseFloat(expense.amount);
    }
    totalOwed += parseFloat(expense.share_amount);
  });
  
  return {
    totalPaid: totalPaid,
    totalOwed: totalOwed,
    netBalance: totalPaid - totalOwed
  };
}

// Helper function to store/update balances in the database
function updateBalancesInDb(groupId, balances) {
  const stmt = db.prepare(`
    INSERT INTO balances (group_id, user_id, net_balance, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(group_id, user_id) DO UPDATE SET
      net_balance = excluded.net_balance,
      updated_at = excluded.updated_at;
  `);

  const transaction = db.transaction(() => {
    for (const balance of balances) {
      stmt.run(groupId, balance.userId, balance.netBalance);
    }
  });

  try {
    transaction();
  } catch (error) {
    console.error('Error updating balances in DB:', error);
    // Don't re-throw, as this is a background task
  }
}

module.exports = router; 