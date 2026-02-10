import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const EditBookModal = ({ isOpen, onClose, book, onUpdate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (book) {
            setTitle(book.title || '');
            setDescription(book.description || '');
            setCategory(book.category || '');
        }
    }, [book]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_BASE_URL}/books/${book.id}`, {
                title,
                description,
                category
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUpdate(res.data);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to update book: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animation-fade-in">
            <div className="bg-white max-w-md w-full border border-black/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-black hover:opacity-50 transition-opacity"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <h2 className="text-xl font-black uppercase tracking-tighter mb-6">EDIT MANIFEST NODE</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
                                TITLE DESIGNATION
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-gray-50 border border-black/10 p-3 font-mono text-sm focus:outline-none focus:border-cobalt-primary transition-colors"
                                required
                                maxLength={200}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
                                SYNOPSIS / DATA (Max 500 chars)
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-gray-50 border border-black/10 p-3 font-mono text-sm h-32 focus:outline-none focus:border-cobalt-primary transition-colors resize-none"
                                maxLength={500}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">
                                CLASSIFICATION TAG
                            </label>
                            <input
                                type="text"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-gray-50 border border-black/10 p-3 font-mono text-sm focus:outline-none focus:border-cobalt-primary transition-colors"
                                required
                                maxLength={50}
                            />
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 border border-black/10 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors"
                            >
                                Cancel EXEC
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 px-4 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-cobalt-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'SAVING...' : <><Save size={14} /> SAVE DATA</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditBookModal;
