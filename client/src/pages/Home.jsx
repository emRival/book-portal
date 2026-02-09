import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Book as BookIcon, ArrowRight, Share2, BarChart3, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Home = () => {
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [streamText, setStreamText] = useState('COORD: 6.6417° S, 106.6667° E');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [booksRes, categoriesRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/books/public`),
                    axios.get(`${API_BASE_URL}/books/categories/list`)
                ]);
                setBooks(booksRes.data);
                setCategories(categoriesRes.data);
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Simulated dynamic coord effect matching IDN Pamijahan (approx)
        const coords = [
            "COORD: 6.6436° S, 106.6714° E", // IDN area approx
            "SMP_IDN_BOARDING_SCHOOL",
            "STUDENT_ARCHIVE_v24",
            "PAM_STRATUM_ACTIVE",
            "MAPPING_STUDENT_MINDS"
        ];
        let i = 0;
        const interval = setInterval(() => {
            setStreamText(coords[i % coords.length]);
            i++;
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const SkeletonCard = () => (
        <div className="animate-pulse">
            <div className="aspect-[3/4] bg-white border border-black/5 vellum-stack mb-6"></div>
            <div className="h-4 bg-gray-200 w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 w-1/2"></div>
        </div>
    );

    const filteredBooks = selectedCategory === 'ALL'
        ? books
        : books.filter(b => b.category === selectedCategory);

    const popularBooks = [...filteredBooks].sort((a, b) => b.views - a.views).slice(0, 4);

    return (
        <div className="min-h-screen text-[#1a1a1a] selection:bg-black selection:text-white font-inter overflow-x-hidden relative blueprint-bg">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;500;800&display=swap');
                    
                    .blueprint-bg {
                        background-color: #f0f0f0;
                        background-image: 
                            linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px);
                        background-size: 40px 40px;
                        background-attachment: fixed;
                    }
                    .vellum-stack {
                        background: rgba(255, 255, 255, 0.75);
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(0,0,0,0.08);
                        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1), 0 2px 5px rgba(0,0,0,0.05);
                        position: relative;
                        transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
                    }
                    .vellum-stack::before {
                        content: '';
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        right: -8px;
                        bottom: -8px;
                        background: rgba(255,255,255,0.45);
                        border: 1px solid rgba(0,0,0,0.04);
                        z-index: -1;
                    }
                    .vellum-stack::after {
                        content: '';
                        position: absolute;
                        top: 16px;
                        left: 16px;
                        right: -16px;
                        bottom: -16px;
                        background: rgba(255,255,255,0.25);
                        border: 1px solid rgba(0,0,0,0.03);
                        z-index: -2;
                    }
                    .technical-glow {
                        border: 1px solid #1a1a1a;
                        outline: 4px solid rgba(0,0,0,0.03);
                    }
                    .technical-glow:hover {
                        outline: 10px solid rgba(0,0,0,0.06);
                        transform: scale(1.01);
                    }
                    .page-flip-anim {
                        width: 100%;
                        height: 100%;
                        background: white;
                        border: 1px solid #ddd;
                        position: relative;
                        transform-origin: left;
                        animation: flip-sheet 4s infinite ease-in-out;
                    }
                    @keyframes flip-sheet {
                        0%, 100% { transform: rotateY(0deg); box-shadow: 2px 2px 10px rgba(0,0,0,0.1); }
                        50% { transform: rotateY(-30deg); box-shadow: 20px 10px 40px rgba(0,0,0,0.05); }
                    }
                `}
            </style>

            <header className="p-12 flex justify-between items-end border-b border-black/5 bg-white/30 backdrop-blur-md sticky top-0 z-[100]">
                <div className="border-l-4 border-black pl-6">
                    <span className="block text-xs font-bold uppercase tracking-[0.3em] opacity-40">Pamijahan Node</span>
                    <h2 className="text-3xl font-extrabold tracking-tighter">IDN_BOOK PORTAL</h2>
                </div>
                <div className="flex gap-12 text-xs font-bold uppercase tracking-widest items-center">
                    <a href="#archive" className="hover:opacity-60 transition-opacity">Archive</a>
                    <a href="#" className="opacity-40 select-none hidden md:block">IDN_BS_PMJ</a>
                    {localStorage.getItem('token') ? (
                        <Link to={localStorage.getItem('role') === 'ADMIN' ? '/admin-dashboard' : '/dashboard'}
                            className="bg-black text-white px-8 py-3 hover:bg-gray-800 transition-all font-bold">
                            ACCESS_SYSTEM
                        </Link>
                    ) : (
                        <Link to="/login" className="bg-black text-white px-8 py-3 hover:bg-gray-800 transition-all font-bold">
                            LOGIN
                        </Link>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 py-16 lg:py-32 items-center">
                <section className="flex flex-col justify-center">
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.8] tracking-tighter mb-8">
                        READ<br />THE<br />STUDENT.
                    </h1>
                    <p className="text-lg font-medium opacity-60 mb-12 max-w-md">
                        Digital library of magazines, textbooks, and IT journals created by students of IDN Pamijahan. A platform for infinite knowledge sharing.
                    </p>
                    <div
                        onClick={() => navigate('/login')}
                        className="vellum-stack p-20 cursor-pointer technical-glow bg-white group hover:z-50"
                    >
                        <div className="border border-black/10 h-48 flex flex-col items-center justify-center gap-4 group-hover:bg-gray-50 transition-colors">
                            <div className="w-12 h-1 border-t-2 border-black"></div>
                            <div className="text-sm font-bold tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">POST YOUR MATERIAL</div>
                            <div className="text-[10px] opacity-30 font-mono transition-opacity group-hover:opacity-100">{streamText}</div>
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center">
                    <div className="relative group">
                        <div className="vellum-stack w-[350px] h-[480px] md:w-[450px] md:h-[600px] flex items-center justify-center overflow-hidden">
                            <div className="w-[300px] h-[400px]">
                                <div className="page-flip-anim flex flex-col p-10">
                                    <div className="h-2 w-1/3 bg-black/10 mb-8"></div>
                                    <div className="space-y-4">
                                        <div className="h-1 w-full bg-black/5"></div>
                                        <div className="h-1 w-full bg-black/5"></div>
                                        <div className="h-1 w-full bg-black/5"></div>
                                        <div className="h-1 w-3/4 bg-black/5"></div>
                                        <div className="h-32 w-full bg-black/5 mt-8"></div>
                                    </div>
                                    <div className="mt-auto flex justify-between">
                                        <div className="text-[8px] font-mono opacity-20 uppercase tracking-widest font-bold">IDN_PROT_REF_24</div>
                                        <div className="text-[8px] font-mono opacity-20">PAGE_01</div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 border-[20px] border-white z-10 pointer-events-none"></div>
                        </div>
                        <div className="absolute -top-12 -right-12 text-[100px] md:text-[150px] font-black opacity-[0.03] pointer-events-none select-none group-hover:opacity-[0.05] transition-opacity">
                            PDF
                        </div>
                    </div>
                </section>
            </main>

            {/* Content Display Grid */}
            <section id="archive" className="py-48 px-12 bg-white relative z-10 border-t border-black/5">
                <div className="max-w-7xl mx-auto">
                    {(loading || popularBooks.length > 0) && (
                        <div>
                            <div className="flex justify-between items-end mb-24">
                                <div className="border-l-4 border-black pl-6">
                                    <h2 className="text-4xl font-black tracking-tighter uppercase">{selectedCategory}_MANIFEST</h2>
                                    <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-30 mt-2">Latest Document Nodes</p>
                                </div>
                                <div className="hidden md:flex gap-4 text-[10px] font-mono opacity-40">
                                    <span>SYSTEM_NODES: {filteredBooks.length}</span>
                                    <span>/</span>
                                    <span>STATUS: ONLINE</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 lg:gap-16">
                                {loading ? (
                                    Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                                ) : (
                                    popularBooks.map((book) => (
                                        <Link to={`/book/${book.slug}`} key={book.id} className="group vellum-stack p-4 bg-white/50 hover:bg-white technical-glow">
                                            <div className="aspect-[3/4] bg-gray-50 border border-black/5 relative overflow-hidden mb-8">
                                                {book.coverImage ? (
                                                    <img
                                                        src={`${API_BASE_URL}/uploads/${book.coverImage}`}
                                                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full p-8 flex flex-col justify-between border-l-2 border-black/20 group-hover:border-black group-hover:bg-gray-100 transition-colors">
                                                        <div className="text-[9px] font-mono opacity-30 uppercase">#REF_{book.id}</div>
                                                        <div className="text-2xl font-black leading-none tracking-tighter">{book.title}</div>
                                                        <div className="h-6 w-1 bg-black/10"></div>
                                                    </div>
                                                )}
                                                <div className="absolute top-4 left-4">
                                                    <div className="bg-black text-white px-3 py-1 text-[8px] font-mono font-bold tracking-[0.2em] uppercase">
                                                        {book.category || 'General'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-1 py-4 flex flex-col gap-1 border-t border-black/5">
                                                <h3 className="font-bold text-xl tracking-tighter leading-none group-hover:text-black transition-colors">{book.title}</h3>
                                                <div className="flex justify-between items-center opacity-40">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{book.author}</span>
                                                    <span className="text-[9px] font-mono font-bold">{book.views} READS</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <footer className="p-24 border-t border-black/5 bg-[#f0f0f0]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="flex flex-col gap-2">
                        <div className="text-xl font-black tracking-tighter">IDN_BOOK PORTAL</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30">ARCHITECTURAL_VELLUM_EDITION v24.2.0</div>
                    </div>
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex-wrap justify-center md:justify-end">
                        <button
                            onClick={() => setSelectedCategory('ALL')}
                            className={`${selectedCategory === 'ALL' ? 'text-black opacity-100 underline underline-offset-4' : 'hover:opacity-100'} transition-all`}
                        >
                            ALL
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`${selectedCategory === cat ? 'text-black opacity-100 underline underline-offset-4' : 'hover:opacity-100'} transition-all`}
                            >
                                {cat}
                            </button>
                        ))}
                        <span className="text-black/80 font-mono ml-8">2026©</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
