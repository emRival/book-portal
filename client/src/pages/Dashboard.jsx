import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Trash2, Library, LogOut, Book as BookIcon, Share2, BarChart3 } from 'lucide-react';
import { useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { API_BASE_URL } from '../config';

// Ensure worker is set for cover generation using a matching CDN version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Dashboard = () => {
    const [books, setBooks] = useState([]);
    const [highestViewBook, setHighestViewBook] = useState(null);
    const [title, setTitle] = useState('');
    // const [author, setAuthor] = useState(''); // Author is now automated
    const [file, setFile] = useState(null);
    const [cover, setCover] = useState(null);
    const [category, setCategory] = useState('General');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const navigate = useNavigate();

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

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        // formData.append('author', author); // Automated on backend
        formData.append('category', category);
        formData.append('pdf', file);
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

        try {
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
            // setAuthor('');
            setCategory('General');
            setFile(null);
            setCover(null);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (coverInputRef.current) coverInputRef.current.value = '';
        } catch (error) {
            alert('Upload failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_BASE_URL}/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBooks();
        } catch (error) {
            alert('Delete failed');
        }
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
        <div className="min-h-screen blueprint-bg p-6 md:p-12">
            <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto">
                <div className="border-l-4 border-black pl-6">
                    <h1 className="text-3xl font-extrabold tracking-tighter">DASHBOARD</h1>
                    <span className="block text-xs font-bold uppercase tracking-widest opacity-40">Content Management</span>
                </div>
                <div className="flex gap-4">
                    <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-cobalt-primary">
                        <Library size={16} /> Public Grid
                    </Link>
                    <button onClick={logout} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-red-600">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

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
                                <span className="relative z-10">{loading ? `UPLOADING ${uploadProgress}%...` : 'UPLOAD TO GRID'}</span>
                                {loading && (
                                    <div
                                        className="absolute top-0 left-0 h-full bg-cobalt-primary transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {books.map(book => (
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
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/read/${book.slug}`);
                                        alert('Link copied to clipboard!');
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
                    {books.length === 0 && (
                        <div className="p-8 text-center opacity-40 font-mono text-sm">
                            NO_DATA_FOUND.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
