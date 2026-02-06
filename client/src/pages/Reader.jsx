import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Reader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const bookInstance = useRef(null);

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const res = await axios.get('http://localhost:3055/books/public');
                const book = res.data.find(b => b.slug === id);
                if (book) {
                    // Unique View Logic: Check localStorage for this specific book slug
                    const viewKey = `viewed_${id}`;
                    if (!localStorage.getItem(viewKey)) {
                        // Increment view count only if not already viewed in this browser
                        axios.post(`http://localhost:3055/books/view/${id}`)
                            .then(() => {
                                localStorage.setItem(viewKey, 'true');
                            })
                            .catch(e => console.error("Analytics error", e));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch book for analytics", err);
            }
        };
        fetchBook();
    }, [id]);

    const pdfUrl = id ? `http://localhost:3055/uploads/${id}.pdf` : '';
    // We'll use the slug directly as most of our PDFs follow the slug name pattern or we can fetch it.
    // However, the best is to fetch the book object to get the EXACT pdfPath.

    const [actualPdfUrl, setActualPdfUrl] = React.useState('');

    useEffect(() => {
        const getBookDetails = async () => {
            try {
                const res = await axios.get('http://localhost:3055/books/public');
                const book = res.data.find(b => b.slug === id);
                if (book) {
                    setActualPdfUrl(`http://localhost:3055/uploads/${book.pdfPath}`);
                }
            } catch (e) { }
        };
        getBookDetails();
    }, [id]);

    return (
        <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
            {/* Nav Back Button - Top Left Over the book */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-4 left-4 z-[9999] bg-black/50 hover:bg-black text-white p-2 rounded-full transition-all backdrop-blur-md border border-white/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            </button>

            <div id="book-container" ref={containerRef} className="flex-1 w-full h-full p-0 m-0">
                {actualPdfUrl && (
                    <iframe
                        src={`/reader.html?pdf=${encodeURIComponent(actualPdfUrl)}&slug=${encodeURIComponent(id)}`}
                        className="w-full h-full border-0"
                        title="IDN Book Reader"
                        allow="fullscreen"
                    />
                )}
            </div>
        </div>
    );
};

export default Reader;
