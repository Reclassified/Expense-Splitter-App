const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Determine the database path based on the environment
const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.resolve(__dirname, 'expense_splitter.db');

const db = new Database(dbPath);

// Create users table
const createUsersTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create groups table
const createGroupsTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  )
`);

// Create group_members table
const createGroupMembersTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(group_id, user_id)
  )
`);

// Create expenses table
const createExpensesTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_by INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (paid_by) REFERENCES users (id)
  )
`);

// Create expense_members table (who is involved in the expense)
const createExpenseMembersTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS expense_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    share_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(expense_id, user_id)
  )
`);

// Create balances table
const createBalancesTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    net_balance DECIMAL(10,2) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE (group_id, user_id)
  )
`);

// Create recurring_expenses table
const createRecurringExpensesTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    paid_by INTEGER NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', etc.
    next_due_date DATETIME NOT NULL,
    end_date DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (paid_by) REFERENCES users (id)
  )
`);

// Create payments table (for settling debts)
const createPaymentsTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    payer_id INTEGER NOT NULL, -- The user who is paying back a debt
    payee_id INTEGER NOT NULL, -- The user who is receiving the money
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (payer_id) REFERENCES users (id),
    FOREIGN KEY (payee_id) REFERENCES users (id)
  )
`);

// Create notifications table
const createNotificationsTable = db.prepare(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT, -- e.g., 'payment_reminder', 'new_expense'
    related_group_id INTEGER,
    related_expense_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

createUsersTable.run();
createGroupsTable.run();
createGroupMembersTable.run();
createExpensesTable.run();
createExpenseMembersTable.run();
createBalancesTable.run();
createRecurringExpensesTable.run();
createPaymentsTable.run();
createNotificationsTable.run();

module.exports = db; 