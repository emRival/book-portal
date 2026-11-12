const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { SECRET_KEY, authenticateToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { registerValidation, loginValidation, changePasswordValidation } = require('../validations/auth.validation');

const prisma = new PrismaClient();
const { decryptPayload } = require('../utils/crypto');

// Middleware to decrypt encrypted payloads
const decryptBody = (req, res, next) => {
    try {
        if (req.body.encrypted && req.body.iv) {
            const decrypted = decryptPayload(req.body.encrypted, req.body.iv);
            req.body = decrypted;
        }
        next();
    } catch (err) {
        console.error('Decryption error:', err.message);
        return res.status(400).json({ error: 'Invalid encrypted payload' });
    }
};

// Verify Cloudflare Turnstile token.
// - Has a per-attempt timeout so a network outage cannot hang login requests.
// - Retries transient network failures (e.g. DNS EAI_AGAIN) a few times.
// Returns { success: boolean, networkError: boolean } so routes can respond
// with an accurate message instead of blaming the user for a server outage.
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ATTEMPTS = parseInt(process.env.TURNSTILE_RETRIES || '3', 10);
const TURNSTILE_TIMEOUT = parseInt(process.env.TURNSTILE_TIMEOUT || '5000', 10);

const verifyTurnstile = async (token) => {
    const secretKey = process.env.CLOUDFLARE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // Test key

    if (!token) {
        return { success: false, networkError: false };
    }

    for (let attempt = 1; attempt <= TURNSTILE_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post(TURNSTILE_URL, {
                secret: secretKey,
                response: token
            }, {
                timeout: TURNSTILE_TIMEOUT
            });
            // Cloudflare answered: this is a definitive verification result.
            return { success: !!response.data.success, networkError: false };
        } catch (error) {
            const isNetworkError = !error.response; // No HTTP response = network/DNS problem
            if (!isNetworkError) {
                // Cloudflare rejected the request itself (bad secret, etc.)
                console.error('Turnstile request rejected by Cloudflare:', error.response?.status, error.response?.data);
                return { success: false, networkError: false };
            }

            console.error(`Turnstile verification error (attempt ${attempt}/${TURNSTILE_ATTEMPTS}): ${error.code || error.message}`);
            if (attempt < TURNSTILE_ATTEMPTS) {
                // Exponential backoff: 500ms, 1000ms, ...
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }
    }

    // All attempts failed due to network issues — server problem, not user problem.
    return { success: false, networkError: true };
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.ip || req.connection.remoteAddress;
};

// Register (Can be used to seed the first user)
router.post('/register', decryptBody, registerValidation, validate, async (req, res) => {
    try {
        // Check if registration is enabled
        const settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
        if (settings && !settings.registrationEnabled) {
            return res.status(403).json({ error: 'Registration is currently closed by the administrator.' });
        }

        const { username, password, cfToken } = req.body;

        // Verify CAPTCHA
        const captcha = await verifyTurnstile(cfToken);
        if (!captcha.success) {
            if (captcha.networkError && process.env.TURNSTILE_FAIL_OPEN !== 'true') {
                // CAPTCHA service unreachable (server-side network problem).
                return res.status(503).json({ error: 'CAPTCHA service is temporarily unavailable. Please try again in a moment.' });
            }
            if (captcha.networkError && process.env.TURNSTILE_FAIL_OPEN === 'true') {
                console.warn('[Auth] Turnstile unreachable — allowing request because TURNSTILE_FAIL_OPEN=true');
            } else {
                return res.status(400).json({ error: 'CAPTCHA verification failed' });
            }
        }

        // Validation handled by middleware
        if (username.toLowerCase() === 'admin') {
            return res.status(400).json({ error: 'Username "admin" is not allowed' });
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
        const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, SECRET_KEY, {
            expiresIn: '24h',
        });

        // Initialize login stats
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: getClientIp(req)
            }
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            username: user.username,
            role: user.role,
            userId: user.id
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// GET Settings (Public)
router.get('/settings', async (req, res) => {
    try {
        let settings = await prisma.systemSettings.findUnique({ where: { id: 1 } });
        // Create default if not exists
        if (!settings) {
            settings = await prisma.systemSettings.create({ data: { id: 1, registrationEnabled: true } });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// ADMIN: Update Settings
router.put('/settings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    try {
        const { registrationEnabled } = req.body;
        const settings = await prisma.systemSettings.upsert({
            where: { id: 1 },
            update: { registrationEnabled },
            create: { id: 1, registrationEnabled }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Login
router.post('/login', decryptBody, loginValidation, validate, async (req, res) => {
    try {
        const { username, password, cfToken } = req.body;

        // Verify CAPTCHA
        const captcha = await verifyTurnstile(cfToken);
        if (!captcha.success) {
            if (captcha.networkError && process.env.TURNSTILE_FAIL_OPEN !== 'true') {
                // CAPTCHA service unreachable (server-side network problem).
                return res.status(503).json({ error: 'CAPTCHA service is temporarily unavailable. Please try again in a moment.' });
            }
            if (captcha.networkError && process.env.TURNSTILE_FAIL_OPEN === 'true') {
                console.warn('[Auth] Turnstile unreachable — allowing login because TURNSTILE_FAIL_OPEN=true');
            } else {
                return res.status(400).json({ error: 'CAPTCHA verification failed' });
            }
        }

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

        // Update Last Login & IP
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: getClientIp(req)
            }
        });

        res.json({ token, username: user.username, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Change Password (User & Admin)
router.post('/change-password', authenticateToken, changePasswordValidation, validate, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Validation handled by middleware

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // If USER, force old password check
        // If ADMIN, check old password ONLY IF provided (optional)
        if (userRole !== 'ADMIN' || oldPassword) {
            const validPassword = await bcrypt.compare(oldPassword, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Incorrect old password' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ADMIN: Get all users
router.get('/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied' });
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, createdAt: true, lastLoginAt: true, lastLoginIp: true },
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
