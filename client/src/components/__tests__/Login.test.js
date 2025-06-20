import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import api from '../../api';

// Mock the api module
jest.mock('../../api');

// Mock the onLogin and onSwitchToRegister props
const mockOnLogin = jest.fn();
const mockOnSwitchToRegister = jest.fn();

describe('Login Component', () => {
    beforeEach(() => {
        // Provide all required props
        render(<Login onLogin={mockOnLogin} onSwitchToRegister={mockOnSwitchToRegister} />);
    });

    afterEach(() => {
        // Clear all mocks after each test
        jest.clearAllMocks();
    });

    it('renders login form correctly', () => {
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('allows user to enter username and password', () => {
        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');

        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(usernameInput.value).toBe('testuser');
        expect(passwordInput.value).toBe('password123');
    });

    it('calls onLogin prop when form is submitted successfully', async () => {
        // Mock the successful API response
        api.post.mockResolvedValue({ 
            data: { 
                token: 'fake_token', 
                user: { id: 1, username: 'testuser' } 
            } 
        });

        const usernameInput = screen.getByLabelText('Username');
        const passwordInput = screen.getByLabelText('Password');
        const loginButton = screen.getByRole('button', { name: 'Login' });

        // Fill out and submit the form
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(loginButton);

        // Wait for the mock function to have been called
        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalledTimes(1);
        });
        expect(mockOnLogin).toHaveBeenCalledWith({ id: 1, username: 'testuser' });
    });

    it('calls onSwitchToRegister prop when register button is clicked', () => {
        const switchButton = screen.getByRole('button', { name: 'Register here' });
        fireEvent.click(switchButton);
        expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
    });
}); 