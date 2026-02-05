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

const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

// ... (existing imports)

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be loaded safely
}));
app.use(xss());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Body limit
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/auth', limiter); // Apply to auth routes

// Static files (for uploaded PDFs and covers)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
