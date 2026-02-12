import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        const redirect = setTimeout(() => {
            navigate('/', { replace: true });
        }, 5000);

        return () => {
            clearInterval(timer);
            clearTimeout(redirect);
        };
    }, [navigate]);

    return (
        <div className="min-h-screen blueprint-bg flex items-center justify-center p-6 font-inter">
            <div className="vellum-stack w-full max-w-lg p-12 technical-glow bg-white text-center relative">
                <div className="border-b-2 border-black/10 pb-6 mb-8">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2">System Response</span>
                    <h1 className="text-7xl font-black tracking-tighter">404</h1>
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">
                        NODE_NOT_FOUND
                    </p>
                    <p className="text-xs font-mono opacity-40">
                        Halaman yang kamu cari tidak ditemukan dalam sistem.
                    </p>
                </div>

                <div className="w-full bg-black/5 h-1 mb-6 overflow-hidden">
                    <div
                        className="h-full bg-black transition-all duration-1000 ease-linear"
                        style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    />
                </div>

                <p className="text-[10px] font-mono opacity-40 mb-6">
                    Auto redirect dalam <span className="font-bold text-black opacity-100">{countdown}</span> detik...
                </p>

                <button
                    onClick={() => navigate('/', { replace: true })}
                    className="bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-cobalt-primary transition-all"
                >
                    Kembali ke Beranda
                </button>

                <div className="mt-8 text-[9px] font-mono opacity-20 uppercase tracking-widest">
                    IDN_BOOK_PORTAL // ERR_404 // REDIRECT_INITIATED
                </div>
            </div>
        </div>
    );
};

export default NotFound;
