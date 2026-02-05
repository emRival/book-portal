const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretkey123';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' });
        }

        // Verify user still exists in DB (crucial if DB was reset)
        try {
            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user) {
                return res.status(401).json({ error: 'Session expired or user no longer exists. Please login again.' });
            }
            req.user = decoded;
            next();
        } catch (dbErr) {
            return res.status(500).json({ error: 'Database authentication error.' });
        }
    });
};

module.exports = { authenticateToken, SECRET_KEY };
