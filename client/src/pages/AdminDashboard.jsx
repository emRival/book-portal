import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Library, LogOut, ShieldAlert, Activity, BarChart3, Users, BookOpen } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const [books, setBooks] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            navigate('/dashboard'); // Kick non-admins back to user dashboard
            return;
        }
        fetchAdminBooks();
    }, []);

    const fetchAdminBooks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/books/admin', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(res.data);
        } catch (error) {
            console.error('Failed to fetch admin books', error);
            if (error.response?.status === 403) navigate('/dashboard');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ADMIN DELETE: Are you sure?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:3000/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAdminBooks();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 md:p-12 font-mono">
            <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto border-b border-gray-700 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-red-500 flex items-center gap-3">
                        <ShieldAlert /> ADMIN CONSOLE
                    </h1>
                    <span className="block text-xs font-bold uppercase tracking-widest opacity-40">System Override Protocol</span>
                </div>
                <div className="flex gap-4">
                    <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-red-500">
                        <Library size={16} /> Public Grid
                    </Link>
                    <button onClick={logout} className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:text-red-500">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Admin Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">SYSTEM_NODES</span>
                            <BookOpen className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{books.length}</div>
                        <div className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Total Materials</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">TRAFFIC_LOAD</span>
                            <Activity className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{books.reduce((acc, b) => acc + b.views, 0)}</div>
                        <div className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Total System Reads</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">USER_BASE</span>
                            <Users className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{[...new Set(books.map(b => b.userId))].length}</div>
                        <div className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Active Uploaders</div>
                    </div>
                </div>

                {/* System Traffic Visualizer */}
                <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                    <h2 className="text-sm font-bold mb-6 text-gray-400 flex items-center gap-2">
                        <BarChart3 size={14} /> SYSTEM_TRAFFIC_VISUALIZER
                    </h2>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={books.slice(0, 10).reverse()}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="title" hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '4px', fontSize: '10px' }}
                                    itemStyle={{ color: '#ef4444' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#ef4444" fillOpacity={1} fill="url(#colorViews)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-6 text-gray-400">GLOBAL DATABASE</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="p-4 opacity-50">ID</th>
                                    <th className="p-4 opacity-50">TITLE</th>
                                    <th className="p-4 opacity-50">AUTHOR</th>
                                    <th className="p-4 opacity-50">UPLOADER</th>
                                    <th className="p-4 opacity-50">VIEWS</th>
                                    <th className="p-4 opacity-50">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map(book => (
                                    <tr key={book.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 text-gray-500">#{book.id}</td>
                                        <td className="p-4 font-bold">{book.title}</td>
                                        <td className="p-4">{book.author}</td>
                                        <td className="p-4 text-blue-400">@{book.user?.username || 'UNKNOWN'}</td>
                                        <td className="p-4 font-bold text-cobalt-primary">{book.views}</td>
                                        <td className="p-4">
                                            <div className="flex gap-3">
                                                <Link to={`/read/${book.slug}`} target="_blank" className="text-xs bg-gray-600 px-2 py-1 hover:bg-white hover:text-black">
                                                    VIEW
                                                </Link>
                                                <button onClick={() => handleDelete(book.id)} className="text-red-500 hover:text-red-400">
                                                    DELETE
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {books.length === 0 && (
                        <div className="p-12 text-center opacity-30">
                            DATABASE_EMPTY
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
