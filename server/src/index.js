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
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"], // Allow inline scripts for redirect & Cloudflare
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for redirect
            imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow images from any HTTPS source (for covers)
            connectSrc: ["'self'", "https://static.cloudflareinsights.com"],
            upgradeInsecureRequests: null, // Optional: disable if causing issues in dev/docker
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Static files (for uploaded PDFs and covers) with fallback for missing images
const fs = require('fs');
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    // Prevent path traversal
    if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (fs.existsSync(filePath)) {
        return express.static(uploadsDir)(req, res, next);
    }
    // For missing image files, serve default cover instead of 404
    const ext = path.extname(req.path).toLowerCase();
    if (['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
        const defaultCover = path.join(uploadsDir, 'default-cover.png');
        if (fs.existsSync(defaultCover)) {
            return res.sendFile(defaultCover);
        }
    }
    // For non-image files (e.g. PDFs), return normal 404
    res.status(404).json({ error: 'File not found' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);

// Database check route
app.get('/', (req, res) => {
    res.send('IDN Book API is running');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Mongoose/Prisma validation errors might look different, but for now generic catch-all
    if (res.headersSent) {
        return next(err);
    }

    // Production: Hide details
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        // Development: Show details
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
