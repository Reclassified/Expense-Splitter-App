const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const db = require('../database');
// const app = require('../app'); // Correctly import the app

// Setup a new express app for testing
const appForTests = express();
appForTests.use(express.json());
appForTests.use('/api/auth', authRouter);

describe('Auth Endpoints', () => {
  // Clean up the database before each test
  beforeEach(() => {
    db.exec('DELETE FROM users');
  });

  it('should register a new user', async () => {
    const res = await request(appForTests).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
  });

  it('should not register a user with a short password', async () => {
    const res = await request(appForTests).post('/api/auth/register').send({
      username: 'testuser2',
      email: 'test2@example.com',
      password: '123',
    });
    expect(res.statusCode).toEqual(400);
  });

  it('should log in an existing user', async () => {
    // First, register a user
    await request(appForTests).post('/api/auth/register').send({
      username: 'loginuser',
      email: 'login@example.com',
      password: 'password123',
    });

    // Then, try to log in
    const res = await request(appForTests).post('/api/auth/login').send({
      username: 'loginuser',
      password: 'password123',
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should not log in with incorrect credentials', async () => {
    const res = await request(appForTests).post('/api/auth/login').send({
      username: 'nouser',
      password: 'wrongpassword',
    });
    expect(res.statusCode).toEqual(401);
  });
});
