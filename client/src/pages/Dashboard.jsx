import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Trash2, Library, LogOut, Book as BookIcon, Share2, BarChart3, Menu, X, Search } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import { jsPDF } from "jspdf";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { API_BASE_URL } from '../config';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ConfirmationModal from '../components/ConfirmationModal';

// Ensure worker is set for cover generation using a matching CDN version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Dashboard = () => {
    const [books, setBooks] = useState([]);
    const [highestViewBook, setHighestViewBook] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // const [author, setAuthor] = useState(''); // Author is now automated
    const [file, setFile] = useState(null);
    const [cover, setCover] = useState(null);
    const [category, setCategory] = useState('General');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const navigate = useNavigate();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Pagination & Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
    const paginatedBooks = filteredBooks.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return; // Should be handled by useEffect redirect, but just in case
            const res = await axios.get(`${API_BASE_URL}/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(res.data);
            if (res.data.length > 0) {
                const highest = [...res.data].sort((a, b) => b.views - a.views)[0];
                setHighestViewBook(highest);
            }
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                logout();
            }
        }
    };

    const compressPDF = async (file) => {
        return new Promise(async (resolve, reject) => {
            try {
                const fileReader = new FileReader();
                fileReader.readAsArrayBuffer(file);

                fileReader.onload = async () => {
                    try {
                        const pdf = await pdfjs.getDocument(fileReader.result).promise;
                        const doc = new jsPDF({
                            orientation: 'p',
                            unit: 'px',
                            hotfixes: ["px_scaling"] // Important for accurate pixel scaling
                        });

                        // Remove default first page to avoid empty page if we add pages dynamically
                        doc.deletePage(1);

                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale for balance between quality and size

                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;

                            await page.render({ canvasContext: context, viewport: viewport }).promise;

                            const imgData = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG

                            doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
                            doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height);

                            setCompressionProgress(Math.round((i / pdf.numPages) * 100));
                        }

                        const blob = doc.output('blob');
                        resolve(blob);
                    } catch (e) {
                        reject(e);
                    }
                };
                fileReader.onerror = (error) => reject(error);
            } catch (error) {
                reject(error);
            }
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        // Validation
        if (file.size > 100 * 1024 * 1024) {
            alert('File too large (Max 100MB)');
            return;
        }
        if (title.length > 200) {
            alert('Title is too long (Max 200 chars)');
            return;
        }
        if (!/^[a-zA-Z0-9\s\-_,]+$/.test(category)) {
            alert('Category contains invalid characters');
            return;
        }

        setLoading(true);
        setIsCompressing(true); // Start tracking compression status

        try {
            // Client-side Compression
            let uploadFile = file;
            if (file.type === 'application/pdf') {
                try {
                    const compressedBlob = await compressPDF(file);
                    // Check if compression actually reduced size
                    if (compressedBlob.size < file.size) {
                        uploadFile = new File([compressedBlob], file.name, { type: 'application/pdf' });
                        console.log(`Compression success: ${formatFileSize(file.size)} -> ${formatFileSize(uploadFile.size)}`);
                    } else {
                        console.log('Compressed file larger than original, keeping original.');
                    }
                } catch (compError) {
                    console.error('Client-side compression failed, falling back to original', compError);
                    alert('Compression failed. Uploading original file.');
                }
            }
            setIsCompressing(false); // End compression tracking

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            // formData.append('author', author); // Automated on backend
            formData.append('category', category);
            formData.append('pdf', uploadFile); // Use potentially compressed file

            if (cover) {
                formData.append('cover', cover);
            } else if (file) {
                // Generate cover from first page of PDF
                try {
                    const fileReader = new FileReader();
                    fileReader.readAsArrayBuffer(file);
                    const arrayBuffer = await new Promise((resolve, reject) => {
                        fileReader.onload = () => resolve(fileReader.result);
                        fileReader.onerror = reject;
                    });

                    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    formData.append('cover', blob, 'generated-cover.png');
                } catch (err) {
                    console.error("Failed to generate cover", err);
                }
            }

            const token = localStorage.getItem('token');

            await axios.post(`${API_BASE_URL}/books`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            fetchBooks();
            setTitle('');
            setDescription('');
            // setAuthor('');
            setCategory('General');
            setFile(null);
            setCover(null);
            setUploadProgress(0);
            setCompressionProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (coverInputRef.current) coverInputRef.current.value = '';
        } catch (error) {
            alert('Upload failed: ' + (error.response?.data?.details?.[0]?.message || error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
            setIsCompressing(false);
        }
    };

    const confirmDelete = async () => {
        if (!bookToDelete) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_BASE_URL}/books/${bookToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBooks();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleDelete = (id) => {
        setBookToDelete(id);
        setDeleteModalOpen(true);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen blueprint-bg p-6 md:p-12 relative">
            <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto relative z-50">
                <div className="border-l-4 border-black pl-6">
                    <h1 className="text-3xl font-extrabold tracking-tighter">DASHBOARD</h1>
                    <span className="block text-xs font-bold uppercase tracking-widest opacity-40">Content Management</span>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-4">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">{localStorage.getItem('username')}</span>
                    <div className="h-8 w-px bg-black/5"></div>
                    <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-cobalt-primary">
                        <Library size={16} /> Public Grid
                    </Link>
                    <button onClick={() => setIsChangePasswordOpen(true)} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-cobalt-primary">
                        <span className="w-2 h-2 bg-cobalt-primary rounded-full"></span> Security
                    </button>
                    <button onClick={logout} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-red-600">
                        <LogOut size={16} /> Logout
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-black"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-lg flex flex-col items-center justify-center gap-8 md:hidden animation-fade-in">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4">
                        Logged in as {localStorage.getItem('username')}
                    </div>
                    <Link
                        to="/"
                        className="text-xl font-black uppercase tracking-tighter hover:text-cobalt-primary flex items-center gap-3"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <Library size={24} /> Public Grid
                    </Link>
                    <button
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsChangePasswordOpen(true);
                        }}
                        className="text-xl font-black uppercase tracking-tighter hover:text-cobalt-primary flex items-center gap-3"
                    >
                        <span className="w-3 h-3 bg-cobalt-primary rounded-full"></span> Security Settings
                    </button>
                    <button
                        onClick={logout}
                        className="text-xl font-black uppercase tracking-tighter text-red-600 hover:text-red-700 flex items-center gap-3"
                    >
                        <LogOut size={24} /> Logout System
                    </button>
                </div>
            )}

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="DELETE MATERIAL"
                message="Are you sure you want to delete this material? This action cannot be undone."
                confirmText="DELETE PERMANENTLY"
                isDanger={true}
            />

            {/* Stats Overview */}
            {highestViewBook && (
                <div className="max-w-6xl mx-auto mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Featured Book */}
                        <div className="lg:col-span-2 bg-black text-white p-8 overflow-hidden relative group">
                            <div className="absolute right-0 top-0 opacity-10 blur-sm scale-150 group-hover:scale-110 transition-transform duration-700">
                                {highestViewBook.coverImage && <img src={`${API_BASE_URL}/uploads/${highestViewBook.coverImage}`} className="w-64 h-auto" />}
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 h-full">
                                <div className="border-l-2 border-cobalt-primary pl-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-cobalt-primary">Highest Impact Material</span>
                                    <h2 className="text-3xl font-black mt-2 tracking-tight">{highestViewBook.title}</h2>
                                    <p className="text-sm font-mono opacity-50 uppercase mt-1">BY {highestViewBook.author}</p>
                                </div>
                                <div className="bg-white/10 p-6 backdrop-blur-md rounded-xl text-center min-w-[140px]">
                                    <div className="text-4xl font-black text-white">{highestViewBook.views}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1">Total Views</div>
                                </div>
                            </div>
                        </div>

                        {/* Visual Analytics */}
                        <div className="lg:col-span-1 bg-white p-6 border border-black/5 technical-glow flex flex-col">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                                <BarChart3 size={12} /> ANALYTICS INTELLIGENCE
                            </h3>
                            <div className="flex-1 min-h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={books.slice(0, 5)}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis dataKey="title" hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '4px', fontSize: '10px', color: '#fff' }}
                                            itemStyle={{ color: '#60a5fa' }}
                                        />
                                        <Bar dataKey="views" radius={[2, 2, 0, 0]}>
                                            {books.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#e5e7eb'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Upload Section */}
                <div className="lg:col-span-1">
                    <div className="vellum-stack p-8 bg-white technical-glow">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Upload size={20} /> INJECT MATERIAL
                        </h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase mb-1">Description (Max 100 words)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Brief summary..."
                                    className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm h-24"
                                    maxLength={500}
                                />
                            </div>
                            {/* Author input removed - automated from login */}
                            <div>
                                <label className="block text-[10px] font-mono uppercase mb-1">Category / Tag</label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    placeholder="e.g. Magazine, IT, Research..."
                                    className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase mb-1">PDF Document (Max 100MB)</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="w-full text-xs font-mono"
                                    ref={fileInputRef}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono uppercase mb-1">Cover Image (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setCover(e.target.files[0])}
                                    className="w-full text-xs font-mono"
                                    ref={coverInputRef}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-3 font-bold uppercase tracking-widest text-xs hover:bg-cobalt-deep disabled:opacity-50 relative overflow-hidden"
                            >
                                <span className="relative z-10">
                                    {isCompressing
                                        ? `COMPRESSING PDF ${compressionProgress}%...`
                                        : loading
                                            ? `UPLOADING ${uploadProgress}%...`
                                            : 'UPLOAD TO GRID'}
                                </span>
                                {(loading || isCompressing) && (
                                    <div
                                        className="absolute top-0 left-0 h-full bg-cobalt-primary transition-all duration-300 ease-out"
                                        style={{ width: `${isCompressing ? compressionProgress : uploadProgress}%` }}
                                    ></div>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Search & Filter */}
                    <div className="bg-white p-6 border border-black/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="SEARCH MANIFEST (TITLE, DESC, TAG)..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1); // Reset to page 1 on search
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-black/10 font-mono text-sm focus:outline-none focus:border-cobalt-primary transition-colors"
                            />
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 whitespace-nowrap">
                            SHOWING {paginatedBooks.length} OF {filteredBooks.length}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {paginatedBooks.map(book => (
                            <div key={book.id} className="bg-white p-6 border border-black/5 flex items-center justify-between hover:shadow-lg transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-16 bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                                        {book.coverImage ? (
                                            <img src={`${API_BASE_URL}/uploads/${book.coverImage}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <BookIcon size={16} className="opacity-20" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{book.title}</h3>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs font-mono text-text-muted uppercase">{book.author}</p>
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 font-bold text-gray-500 uppercase tracking-tighter">
                                                {book.category}
                                            </span>
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[10px] font-bold text-cobalt-primary flex items-center gap-1">
                                                <Share2 size={10} /> {book.views} READS
                                            </span>
                                            {book.fileSize > 0 && (
                                                <>
                                                    <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                                    <span className="text-[10px] font-mono text-gray-500">
                                                        {formatFileSize(book.fileSize)}
                                                    </span>
                                                </>
                                            )}
                                            <span className="w-1 h-1 bg-black/10 rounded-full"></span>
                                            <span className="text-[10px] font-mono font-bold uppercase text-black/40">
                                                {new Date(book.createdAt).toLocaleDateString()}
                                            </span>
                                            {book.isProcessing && (
                                                <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded ml-2 animate-pulse">
                                                    PROCESSING
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            const shareUrl = `${window.location.origin}/share/${book.slug}`;
                                            navigator.clipboard.writeText(shareUrl);
                                            alert('Share link copied to clipboard: ' + shareUrl);
                                        }}
                                        className="text-xs font-bold px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    >
                                        <Share2 size={12} /> SHARE
                                    </button>
                                    <Link to={`/read/${book.slug}`} className="text-xs font-bold px-4 py-2 bg-gray-100 hover:bg-cobalt-primary hover:text-white transition-colors">
                                        VIEW
                                    </Link>
                                    <button onClick={() => handleDelete(book.id)} className="text-red-500 hover:text-red-700 p-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredBooks.length === 0 && (
                            <div className="p-8 text-center opacity-40 font-mono text-sm bg-white border border-black/5">
                                NO_DATA_MATCHING_FILTER.
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold border ${currentPage === page
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-black border-black/10 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
