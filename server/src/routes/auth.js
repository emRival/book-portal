const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { SECRET_KEY } = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// Register (Can be used to seed the first user)
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (username.toLowerCase() === 'admin') {
            return res.status(400).json({ error: 'Username "admin" is not allowed' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // If this is the FIRST user, make them ADMIN
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? 'ADMIN' : 'USER';

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role
            },
        });
        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, SECRET_KEY, {
            expiresIn: '24h',
        });

        res.json({ token, username: user.username, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// ADMIN: Get all users
router.get('/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ADMIN: Delete user
router.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    try {
        const userId = parseInt(req.params.id);
        // Prevent deleting yourself
        if (userId === req.user.userId) return res.status(400).json({ error: 'Cannot delete your own admin account' });

        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ADMIN: Reset Password
router.post('/users/:id/reset-password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    try {
        const userId = parseInt(req.params.id);
        const newPassword = await bcrypt.hash('idn123', 10); // Default reset password

        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword }
        });
        res.json({ message: 'Password reset to "idn123"' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
