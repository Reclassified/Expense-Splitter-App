const request = require('supertest');
const express = require('express');
const notificationsRouter = require('../routes/notifications');

const app = express();
// Mock auth middleware to always pass and set req.user
app.use((req, res, next) => {
  req.user = { userId: 1 };
  next();
});
app.use('/notifications', notificationsRouter);

jest.mock('../middleware/auth', () => (req, res, next) => next());

jest.mock('../database', () => {
  return {
    prepare: jest.fn(() => ({
      all: jest.fn(() => [
        {
          id: 1,
          user_id: 1,
          message: 'Test notification',
          is_read: 0,
          created_at: '2024-01-01',
        },
      ]),
      run: jest.fn(() => ({ changes: 1 })),
    })),
  };
});

describe('GET /notifications', () => {
  it('returns notifications for the user', async () => {
    const res = await request(app).get('/notifications');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('message', 'Test notification');
  });
});
