const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: API for managing groups
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - members
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               currency:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       '201':
 *         description: Group created successfully
 *       '400':
 *         description: Invalid input
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Insert group
    const insertGroup = db.prepare(
      'INSERT INTO groups (name, description, created_by) VALUES (?, ?, ?)',
    );
    const result = insertGroup.run(
      name.trim(),
      description?.trim() || null,
      userId,
    );

    // Add creator as owner
    const insertMember = db.prepare(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
    );
    insertMember.run(result.lastInsertRowid, userId, 'owner');

    // Get the created group with member info
    const group = db
      .prepare(
        `
      SELECT g.*, gm.role, u.username as created_by_username
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN users u ON g.created_by = u.id
      WHERE g.id = ? AND gm.user_id = ?
    `,
      )
      .get(result.lastInsertRowid, userId);

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups for the logged-in user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    const groups = db
      .prepare(
        `
      SELECT 
        g.id, 
        g.name, 
        g.description, 
        u.username as created_by_username,
        gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM expenses WHERE group_id = g.id) as expense_count,
        (SELECT EXISTS(SELECT 1 FROM balances WHERE group_id = g.id AND user_id = ? AND net_balance != 0)) as has_unpaid_balance
      FROM groups g
      JOIN users u ON g.created_by = u.id
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      GROUP BY g.id, g.name, g.description, u.username, gm.role
      ORDER BY g.created_at DESC
    `,
      )
      .all(userId, userId);

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get details of a specific group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Group details
 *       '403':
 *         description: Access denied
 *       '404':
 *         description: Group not found
 */
router.get('/:groupId', authenticateToken, (req, res) => {
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

    // Get group details with members
    const group = db
      .prepare(
        `
      SELECT g.*, u.username as created_by_username
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = ?
    `,
      )
      .get(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get all members
    const members = db
      .prepare(
        `
      SELECT gm.*, u.username, u.email
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role DESC, u.username
    `,
      )
      .all(groupId);

    res.json({ ...group, members });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add member to group
router.post('/:groupId/members', authenticateToken, (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;
    const userId = req.user.userId;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if current user has permission (owner or admin)
    const currentMember = db
      .prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      )
      .get(groupId, userId);
    if (
      !currentMember ||
      (currentMember.role !== 'owner' && currentMember.role !== 'admin')
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Find user to add
    const userToAdd = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userToAdd.id);
    if (existingMember) {
      return res
        .status(400)
        .json({ error: 'User is already a member of this group' });
    }

    // Add member
    const insertMember = db.prepare(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
    );
    insertMember.run(groupId, userToAdd.id, 'member');

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
router.delete('/:groupId/members/:memberId', authenticateToken, (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user.userId;

    // Check if current user has permission (owner or admin)
    const currentMember = db
      .prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      )
      .get(groupId, userId);
    if (
      !currentMember ||
      (currentMember.role !== 'owner' && currentMember.role !== 'admin')
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if trying to remove owner
    const memberToRemove = db
      .prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      )
      .get(groupId, memberId);
    if (memberToRemove && memberToRemove.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove group owner' });
    }

    // Remove member
    const deleteMember = db.prepare(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
    );
    const result = deleteMember.run(groupId, memberId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update member role
router.patch(
  '/:groupId/members/:memberId/role',
  authenticateToken,
  (req, res) => {
    try {
      const { groupId, memberId } = req.params;
      const { role } = req.body;
      const userId = req.user.userId;

      if (!role || !['owner', 'admin', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Only owner can change roles
      const currentMember = db
        .prepare(
          'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
        )
        .get(groupId, userId);
      if (!currentMember || currentMember.role !== 'owner') {
        return res
          .status(403)
          .json({ error: 'Only group owner can change roles' });
      }

      // Update role
      const updateRole = db.prepare(
        'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
      );
      const result = updateRole.run(role, groupId, memberId);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json({ message: 'Role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

module.exports = router;
