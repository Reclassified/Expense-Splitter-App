require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const app = require('./app');

// Initialize database
require('./database');

const PORT = process.env.PORT || 3001;

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Splitter API',
      version: '1.0.0',
      description: 'API for managing expenses, groups, and users.',
    },
    servers: [{ url: 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/balances', require('./routes/balances'));
app.use('/api/currency', require('./routes/currency'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Expense Splitter API is running!' });
});

// Scheduler: instantiate recurring expenses when due
cron.schedule('0 * * * *', () => {
  // Every hour
  try {
    const now = new Date();
    const dueRecurs = db
      .prepare(
        `SELECT * FROM recurring_expenses WHERE is_active = 1 AND next_due_date <= ?`,
      )
      .all(now.toISOString());
    dueRecurs.forEach((recur) => {
      // Insert new expense
      const insertExpense = db.prepare(
        'INSERT INTO expenses (group_id, title, amount, paid_by, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      const nowStr = new Date().toISOString();
      insertExpense.run(
        recur.group_id,
        recur.title,
        recur.amount,
        recur.paid_by,
        recur.description,
        nowStr,
        nowStr,
      );
      // Calculate next due date
      let next = new Date(recur.next_due_date);
      if (recur.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (recur.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (recur.frequency === 'monthly')
        next.setMonth(next.getMonth() + 1);
      else return; // Unknown frequency
      // Update next_due_date
      db.prepare(
        'UPDATE recurring_expenses SET next_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ).run(next.toISOString(), recur.id);
      // Optionally, deactivate if end_date is reached
      if (recur.end_date && new Date(next) > new Date(recur.end_date)) {
        db.prepare(
          'UPDATE recurring_expenses SET is_active = 0 WHERE id = ?',
        ).run(recur.id);
      }
    });
  } catch (err) {
    console.error('Recurring expense scheduler error:', err);
  }

  // Payment reminder logic
  try {
    const debtors = db
      .prepare(
        `
      SELECT b.user_id, u.username, b.group_id, g.name as group_name, b.net_balance
      FROM balances b
      JOIN users u ON b.user_id = u.id
      JOIN groups g ON b.group_id = g.id
      WHERE b.net_balance < 0
    `,
      )
      .all();

    const insertNotification = db.prepare(
      'INSERT INTO notifications (user_id, message, type, related_group_id) VALUES (?, ?, ?, ?)',
    );

    debtors.forEach((debtor) => {
      const message = `Reminder: You have an outstanding balance of ${Math.abs(debtor.net_balance).toFixed(2)} in the group "${debtor.group_name}".`;
      // Avoid sending duplicate reminders too frequently (logic can be improved)
      const existing = db
        .prepare(
          'SELECT 1 FROM notifications WHERE user_id = ? AND related_group_id = ? AND type = ? AND is_read = 0',
        )
        .get(debtor.user_id, debtor.group_id, 'payment_reminder');

      if (!existing) {
        insertNotification.run(
          debtor.user_id,
          message,
          'payment_reminder',
          debtor.group_id,
        );
      }
    });
  } catch (err) {
    console.error('Payment reminder scheduler error:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
