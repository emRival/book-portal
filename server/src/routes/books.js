const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/authMiddleware');
const { exec } = require('child_process'); // For Ghostscript
const util = require('util');
const execPromise = util.promisify(exec);

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
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.'));
        }
    }
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
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
});

// Public: Get all books for Home page
router.get('/public', async (req, res) => {
    try {
        const books = await prisma.book.findMany({
            where: { isProcessing: false },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        });
        res.json(books);
    } catch (error) {
        console.error("Error fetching public books:", error);
        res.status(500).json({ error: 'Failed to fetch books', details: error.message });
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
        const { title, category, description } = req.body;

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

        // 1. Get stats of original uploaded file
        const originalPdfAbsolutePath = path.join(process.cwd(), 'uploads', pdfPath);
        const originalStats = fs.statSync(originalPdfAbsolutePath);
        const initialFileSize = originalStats.size;

        // 2. Create DB Record IMMEDIATELY (Prevent Cloudflare Timeout)
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
                description: description || "",
                slug,
                pdfPath: pdfPath, // Start with original
                coverImage: coverPath,
                fileSize: initialFileSize,
                userId: req.user.userId,
                isProcessing: true // Mark as processing initially
            }
        });

        // 3. Respond to client immediately
        res.status(201).json(book);

        // 4. Background Process: Compress PDF
        (async () => {
            // Optimization: Skip compression if file < 20MB
            if (initialFileSize < 20 * 1024 * 1024) {
                console.log(`[Background] Skipping compression for book ${book.id} (${slug}) - Size ${initialFileSize} < 20MB`);
                // Mark as ready since we skipped compression
                await prisma.book.update({
                    where: { id: book.id },
                    data: { isProcessing: false }
                });
                return;
            }

            console.log(`[Background] Starting compression for book ${book.id} (${slug})`);
            try {
                const compressedPdfFilename = `compressed-${Date.now()}.pdf`;
                const compressedPdfPath = path.join(process.cwd(), 'uploads', compressedPdfFilename);

                // Helper to get page count
                const getPageCount = async (filePath) => {
                    try {
                        // Ghostscript command to count pages
                        const cmd = `gs -q -dNODISPLAY -c "(${filePath}) (r) file runpdfbegin pdfpagecount = quit"`;
                        const { stdout } = await execPromise(cmd);
                        return parseInt(stdout.trim()) || 0;
                    } catch (e) {
                        console.error("Error counting pages:", e);
                        return 0;
                    }
                };

                const totalPages = await getPageCount(originalPdfAbsolutePath);
                console.log(`[Background] Total pages for ${slug}: ${totalPages}`);

                // Parallel Chunking Strategy
                const CHUNK_SIZE = 10;
                const CONCURRENCY_LIMIT = 5;

                // Only use chunking if pages > 20 (otherwise single pass is fine)
                if (totalPages > 20) {
                    console.log(`[Background] Using Parallel Chunking (Pages: ${totalPages}, Chunk: ${CHUNK_SIZE})`);

                    const chunks = [];
                    const chunkFiles = [];
                    const tempDir = path.join(process.cwd(), 'uploads', `temp-${book.id}-${Date.now()}`);
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

                    // Create chunks
                    for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
                        const start = i;
                        const end = Math.min(i + CHUNK_SIZE - 1, totalPages);
                        chunks.push({ start, end, index: chunks.length });
                    }

                    // Process chunks with concurrency control
                    const processChunk = async (chunk) => {
                        const chunkFilename = `chunk-${chunk.index.toString().padStart(4, '0')}.pdf`;
                        const chunkPath = path.join(tempDir, chunkFilename);
                        chunkFiles.push(chunkPath);

                        const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dFirstPage=${chunk.start} -dLastPage=${chunk.end} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${chunkPath}" "${originalPdfAbsolutePath}"`;
                        await execPromise(cmd);
                        return chunkPath;
                    };

                    // Run in batches
                    for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
                        const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);
                        await Promise.all(batch.map(processChunk));
                        console.log(`[Background] Processed batch ${i / CONCURRENCY_LIMIT + 1}/${Math.ceil(chunks.length / CONCURRENCY_LIMIT)}`);
                    }

                    // Sort chunk files to ensure correct order (though we pushed in order)
                    chunkFiles.sort();

                    // Merge Chunks
                    console.log(`[Background] Merging ${chunkFiles.length} chunks...`);
                    // Use a file list for GS to avoid command line length limits if many chunks
                    // But for now, direct arg passing is likely fine for reasonable sizes.
                    // If too many files, we could write a response file (check GS docs for @filelist), 
                    // but standard exec might hit limits.
                    // Construct command strictly with sorted chunk list.
                    const mergeCmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${compressedPdfPath}" ${chunkFiles.map(f => `"${f}"`).join(' ')}`;
                    await execPromise(mergeCmd);

                    // Cleanup Temp
                    fs.rmSync(tempDir, { recursive: true, force: true });

                } else {
                    // Standard single-pass compression for small page count
                    console.log(`[Background] Using Single-Pass Compression (Pages: ${totalPages})`);
                    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${compressedPdfPath}" "${originalPdfAbsolutePath}"`;
                    await execPromise(command);
                }

                // Check new size
                const newStats = fs.statSync(compressedPdfPath);
                const newFileSize = newStats.size;

                // Validation: If compressed file is too small (< 5KB), assume failure
                if (newFileSize < 5 * 1024) {
                    throw new Error(`Compressed file too small (${newFileSize} bytes), potential corruption.`);
                }

                console.log(`[Background] Compression success: ${initialFileSize} -> ${newFileSize} bytes`);

                // Update DB
                await prisma.book.update({
                    where: { id: book.id },
                    data: {
                        pdfPath: compressedPdfFilename,
                        fileSize: newFileSize,
                        isProcessing: false // Mark as ready
                    }
                });

                // Delete original file
                fs.unlinkSync(originalPdfAbsolutePath);
                console.log(`[Background] Original file deleted: ${pdfPath}`);

            } catch (error) {
                console.error(`[Background] Compression failed for book ${book.id}:`, error);

                // Fallback: If compression fails, use ORIGINAL file and mark ready
                // effectively skipping compression for this error case
                await prisma.book.update({
                    where: { id: book.id },
                    data: { isProcessing: false }
                });
            }
        })();

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to upload book', details: error.message });
        }
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

// GET share link (Dynamic Meta Tags)
router.get('/share/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const book = await prisma.book.findUnique({
            where: { slug },
            select: { title: true, coverImage: true, category: true, author: true, description: true }
        });

        if (!book) return res.status(404).send('Book not found');

        // Construct absolute URLs
        // Assume domain is passed via env or hardcoded for now based on request context
        const domain = process.env.DOMAIN || 'https://book.idnbogor.id';
        const coverUrl = book.coverImage ? `${domain}/uploads/${book.coverImage}` : `${domain}/default-cover.png`;
        const bookUrl = `${domain}/read/${slug}`; // Frontend viewer URL
        const description = book.description || `Read '${book.title}' by ${book.author} on IDN Book. Category: ${book.category}`;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${book.title} - IDN Book</title>
                
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="book" />
                <meta property="og:url" content="${bookUrl}" />
                <meta property="og:title" content="${book.title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${coverUrl}" />
                <meta property="og:image:width" content="800" />

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="${bookUrl}" />
                <meta property="twitter:title" content="${book.title}" />
                <meta property="twitter:description" content="${description}" />
                <meta property="twitter:image" content="${coverUrl}" />

                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f8f9fa;
                        color: #333;
                    }
                    .loader {
                        width: 48px;
                        height: 48px;
                        border: 5px solid #000;
                        border-bottom-color: transparent;
                        border-radius: 50%;
                        display: inline-block;
                        box-sizing: border-box;
                        animation: rotation 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    @keyframes rotation {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    p { font-size: 1.2rem; margin-bottom: 2rem; }
                    .btn {
                        padding: 10px 20px;
                        background-color: #000;
                        color: #fff;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: bold;
                    }
                </style>
                <script>
                    let timeLeft = 3;
                    function updateTimer() {
                        document.getElementById('timer').innerText = timeLeft;
                        if (timeLeft <= 0) {
                            window.location.href = "${bookUrl}";
                        } else {
                            timeLeft--;
                            setTimeout(updateTimer, 1000);
                        }
                    }
                    window.onload = updateTimer;
                </script>
            </head>
            <body>
                <span class="loader"></span>
                <p>Redirecting to <strong>${book.title}</strong> in <span id="timer">3</span> seconds...</p>
                <a href="${bookUrl}" class="btn">Click here if not redirected</a>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error("Share link error:", error);
        res.status(500).send('Error generating share link');
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
