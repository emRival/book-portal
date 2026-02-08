const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

// GET all books (Public Grid - Released books)
// Ideally this should be /books/public, but keeping root / restricted to "My Books" matches the request implementation plan.
// Let's split:
// GET /books -> My Books (Protected)
// GET /books/public -> All Books (Public)
// GET /books/admin -> All Books (Admin Protected)

// Get unique categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await prisma.book.findMany({
            distinct: ['category'],
            select: {
                category: true
            }
        });
        res.json(categories.map(c => c.category));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Public: Get all books for Home page
router.get('/public', async (req, res) => {
    try {
        const books = await prisma.book.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

// Protected: Get MY books (Dashboard)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const books = await prisma.book.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(books);
    } catch (error) {
        console.error("Error fetching user books:", error);
        res.status(500).json({ error: 'Failed to fetch your books', details: error.message });
    }
});

// Admin: Get ALL books
router.get('/admin', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
        const books = await prisma.book.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin books' });
    }
});

// Helper to create slug
const createSlug = (title) => {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

const sharp = require('sharp');

// POST upload book (Protected)
router.post('/', authenticateToken, upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, category } = req.body;

        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const pdfPath = req.files.pdf[0].filename;
        let coverPath = null;

        if (req.files.cover) {
            const originalCoverPath = req.files.cover[0].path;
            const compressedFilename = `compressed-${Date.now()}.webp`;
            const compressedPath = path.join(process.cwd(), 'uploads', compressedFilename);

            try {
                // Resize to max 800px width and convert to webp for extreme speed
                await sharp(originalCoverPath)
                    .resize({ width: 800, withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(compressedPath);

                // Delete original chunky file
                fs.unlinkSync(originalCoverPath);
                coverPath = compressedFilename;
            } catch (sharpError) {
                console.error("Image optimization failed, using original", sharpError);
                coverPath = req.files.cover[0].filename;
            }
        }

        // Ensure unique slug
        let baseSlug = createSlug(title);
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.book.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const book = await prisma.book.create({
            data: {
                title,
                author: req.user.username,
                category: category || "General",
                slug,
                pdfPath,
                coverImage: coverPath,
                userId: req.user.userId
            }
        });

        res.status(201).json(book);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload book', details: error.message });
    }
});

// POST increment view count (Public)
router.post('/view/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const book = await prisma.book.findUnique({ where: { slug } });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const updatedBook = await prisma.book.update({
            where: { slug },
            data: { views: { increment: 1 } }
        });
        res.json({ views: updatedBook.views });
    } catch (error) {
        res.status(500).json({ error: 'Failed to increment view' });
    }
});

// GET book by slug (Public)
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const book = await prisma.book.findUnique({
            where: { slug },
            include: { user: { select: { username: true } } }
        });

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json(book);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch book by slug' });
    }
});

// DELETE book (Protected - Owner or Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const book = await prisma.book.findUnique({ where: { id: parseInt(id) } });

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check ownership or admin
        if (book.userId !== req.user.userId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You do not have permission to delete this book' });
        }

        // Delete files
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (book.pdfPath) {
            const pPath = path.join(uploadDir, book.pdfPath);
            if (fs.existsSync(pPath)) fs.unlinkSync(pPath);
        }
        if (book.coverImage) {
            const cPath = path.join(uploadDir, book.coverImage);
            if (fs.existsSync(cPath)) fs.unlinkSync(cPath);
        }

        await prisma.book.delete({ where: { id: parseInt(id) } });

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

module.exports = router;
