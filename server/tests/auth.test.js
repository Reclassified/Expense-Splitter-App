const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const db = require('../database');

// Setup a new express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
    // Clean up the database before each test
    beforeEach(() => {
        db.exec('DELETE FROM users');
    });

    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully');
    });

    it('should not register a user with a duplicate username', async () => {
        // First, register a user
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test1@example.com',
                password: 'password123',
            });
        
        // Then, try to register again with the same username
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test2@example.com',
                password: 'password123',
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should login an existing user and return a token', async () => {
        // First, register a user
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            });
        
        // Then, login
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'password123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login with incorrect password', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            });
        
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'wrongpassword',
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });
}); 