const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 'loopback, linklocal, uniquelocal'); // Trust Docker internal networks

const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

// ... (existing imports)

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded safely
}));
app.use(xss());
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(mongoSanitize()); // Prevent NoSQL Injection (even if using SQL, good practice for object injection)
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(morgan('dev'));

// Block sensitive files
app.use((req, res, next) => {
    const sensitiveFiles = ['.env', '.git', '.gitignore', 'package.json', 'package-lock.json', 'yarn.lock', 'docker-compose.yml', 'Dockerfile'];
    const forbiddenPaths = ['/uploads/..', '/etc/passwd']; // Basic path traversal checks

    // Check if path starts with dot (hidden files) or contains sensitive filenames
    const path = req.path.toLowerCase();
    if (path.startsWith('/.') || sensitiveFiles.some(file => path.includes(`/${file}`)) || forbiddenPaths.some(p => path.includes(p))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
});

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Strict limit for auth routes
    message: 'Too many login attempts, please try again later.'
});
app.use('/auth', authLimiter); // Apply to auth routes

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // General API limit
    message: 'Too many requests, please try again later.'
});
app.use('/books', globalLimiter);

// Static files (for uploaded PDFs and covers)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);

// Database check route
app.get('/', (req, res) => {
    res.send('IDN Book API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
