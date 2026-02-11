import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Book as BookIcon, ArrowLeft, Share2, BookOpen, Clock, FileText } from 'lucide-react';

const BookDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/books/slug/${slug}`);
                setBook(res.data);
            } catch (error) {
                console.error("Failed to fetch book", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBook();
    }, [slug]);

    useEffect(() => {
        if (book) {
            document.title = `${book.title} — IDN Book Portal`;
        }
        return () => {
            document.title = 'IDN Book Portal — Buku IT Gratis: TKJ, RPL, Game Dev, Robotik | IDN Boarding School';
        };
    }, [book]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="min-h-screen blueprint-bg flex items-center justify-center">
                <div className="animate-pulse text-xs font-bold uppercase tracking-widest opacity-40">Loading System Node...</div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="min-h-screen blueprint-bg flex items-center justify-center flex-col gap-4">
                <div className="text-xl font-bold uppercase tracking-widest opacity-40">System Node Not Found</div>
                <button onClick={() => navigate('/')} className="text-xs font-bold px-4 py-2 bg-black text-white hover:bg-gray-800 transition-all flex items-center gap-2">
                    <ArrowLeft size={16} /> RETURN TO GRID
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen blueprint-bg font-inter text-[#1a1a1a]">
            {/* Nav */}
            <nav className="p-6 md:p-12 absolute top-0 left-0 w-full z-10">
                <button
                    onClick={() => navigate('/')}
                    className="bg-white/50 backdrop-blur-md border border-black/5 hover:bg-white text-xs font-bold px-6 py-3 uppercase tracking-widest transition-all flex items-center gap-2 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK_TO_GRID
                </button>
            </nav>

            <main className="min-h-screen flex items-center justify-center p-4 md:p-8 pt-20 md:pt-24">
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 md:gap-12 items-start md:items-center">

                    {/* Left: Cover */}
                    <div className="flex justify-center md:justify-end">
                        <div className="relative group w-[180px] md:w-[280px]">
                            <div className="vellum-stack p-2 md:p-3 bg-white technical-glow">
                                <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden border border-black/5">
                                    {book.coverImage ? (
                                        <img
                                            src={`${API_BASE_URL}/uploads/${book.coverImage}`}
                                            className="w-full h-full object-cover shadow-inner"
                                            alt={book.title}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center opacity-20">
                                            <BookIcon size={32} strokeWidth={1} />
                                            <span className="text-[8px] font-mono mt-2 uppercase tracking-widest">No Cover Signal</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Decorative elements behind */}
                            <div className="absolute -z-10 top-6 -right-6 w-full h-full border-[1px] border-black/5"></div>
                            <div className="absolute -z-10 bottom-6 -left-6 w-full h-full border-[1px] border-black/5"></div>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex flex-col gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2 opacity-50">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 bg-black/5 rounded-sm">
                                    {book.category}
                                </span>
                                {book.fileSize > 0 && (
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                                        <FileText size={12} /> {formatFileSize(book.fileSize)}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-tight mb-3">
                                {book.title}
                            </h1>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-60">
                                <span>BY {book.author}</span>
                                <span className="w-1 h-1 bg-black rounded-full"></span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(book.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="w-full h-[1px] bg-black/10"></div>

                        <div className="prose prose-sm max-w-none">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Synopsis</h3>
                            <p className="text-sm md:text-base leading-relaxed opacity-80 font-serif line-clamp-6 md:line-clamp-none">
                                {book.description || "No description available for this document."}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            {book.isProcessing ? (
                                <button disabled className="flex-1 bg-gray-300 text-gray-500 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] cursor-not-allowed flex items-center justify-center gap-2">
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Clock size={16} className="animate-spin" /> PROCESSING...
                                    </span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(`/read/${book.slug}`)}
                                    className="flex-1 bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-cobalt-primary transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        <BookOpen size={16} /> READ
                                    </span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}/share/${book.slug}`;
                                    navigator.clipboard.writeText(shareUrl);
                                    alert('Share link copied to system clipboard.');
                                }}
                                className="px-6 py-3 border border-black/10 hover:bg-white hover:border-black text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Share2 size={16} /> SHARE
                            </button>
                        </div>

                        <div className="text-[10px] font-mono opacity-30 uppercase tracking-widest mt-4">
                            IDN_SECURE_ARCHIVE // REF_{book.id.toString().padStart(4, '0')} // V_{book.views}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default BookDetail;
