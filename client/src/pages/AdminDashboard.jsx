import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Library, LogOut, ShieldAlert, Activity, BarChart3, Users, BookOpen, Lock, UserX, Menu, X } from 'lucide-react';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../config';

const AdminDashboard = () => {
    const [books, setBooks] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('books'); // 'books' or 'users'
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'ADMIN') {
            navigate('/dashboard');
            return;
        }
        fetchData();
    }, []);

    const fetchData = () => {
        fetchAdminBooks();
        fetchUsers();
        fetchSettings();
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/auth/settings`);
            setRegistrationEnabled(res.data.registrationEnabled);
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    const handleToggleRegistration = async () => {
        const token = localStorage.getItem('token');
        try {
            const newState = !registrationEnabled;
            await axios.put(`${API_BASE_URL}/auth/settings`, { registrationEnabled: newState }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRegistrationEnabled(newState);
            alert(`Registration is now ${newState ? 'OPEN' : 'CLOSED'}`);
        } catch (error) {
            alert('Failed to update settings');
        }
    };

    const fetchAdminBooks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/books/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(res.data);
        } catch (error) {
            console.error('Failed to fetch admin books', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/auth/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleDeleteBook = async (id) => {
        if (!window.confirm('ADMIN DELETE: Are you sure?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_BASE_URL}/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAdminBooks();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('BAN USER: This will permanently delete the account and all their books. Cannot be undone. Continue?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_BASE_URL}/auth/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('User deleted (Banned)');
            fetchUsers();
            fetchAdminBooks(); // Refresh books as user's books are gone or need update
        } catch (error) {
            alert(error.response?.data?.error || 'Delete failed');
        }
    };

    const handleResetPassword = async (id) => {
        if (!window.confirm('Reset password to "idn123"?')) return;
        const token = localStorage.getItem('token');
        try {
            await axios.post(`${API_BASE_URL}/auth/users/${id}/reset-password`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Password reset to "idn123"');
        } catch (error) {
            alert('Reset failed');
        }
    };

    const handleBanToggle = async (user) => {
        const action = user.isBanned ? 'unban' : 'ban';
        if (!window.confirm(`${action.toUpperCase()} USER: Are you sure you want to ${action} ${user.username}?`)) return;

        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_BASE_URL}/auth/users/${user.id}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`User ${action}ned successfully`);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || 'Action failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-mono selection:bg-red-500 selection:text-white">
            {/* Header */}
            <header className="fixed top-0 w-full bg-gray-900/95 backdrop-blur z-50 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-500 flex items-center gap-3">
                            <ShieldAlert size={24} /> ADMIN_CONSOLE
                        </h1>
                        <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest opacity-40">System Override Protocol</span>
                    </div>

                    {/* Registration Toggle */}
                    <div className="hidden md:flex items-center gap-3 mr-auto ml-12">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">REGISTRATION:</span>
                        <button
                            onClick={handleToggleRegistration}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${registrationEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                        >
                            <div className={`w-4 h-4 rounded-full shadow-md transition-transform ${registrationEnabled ? 'translate-x-6 bg-green-500' : 'translate-x-0 bg-red-500'}`}></div>
                        </button>
                    </div>

                    {/* Desktop Hooks */}
                    <div className="hidden md:flex items-center gap-6">
                        <button
                            onClick={() => setActiveTab('books')}
                            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-all ${activeTab === 'books' ? 'bg-red-500/10 text-red-500' : 'opacity-50 hover:opacity-100'}`}
                        >
                            Database
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-all ${activeTab === 'users' ? 'bg-red-500/10 text-red-500' : 'opacity-50 hover:opacity-100'}`}
                        >
                            User_Base
                        </button>
                        <div className="h-6 w-px bg-gray-700"></div>
                        <Link to="/" className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 hover:text-red-500 flex items-center gap-2">
                            <Library size={14} /> Grid
                        </Link>
                        <button onClick={logout} className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 hover:text-red-500 flex items-center gap-2">
                            <LogOut size={14} /> Exit
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-gray-800 border-b border-gray-700 p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-60">REGISTRATION</span>
                            <button
                                onClick={handleToggleRegistration}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${registrationEnabled ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                            >
                                <div className={`w-4 h-4 rounded-full shadow-md transition-transform ${registrationEnabled ? 'translate-x-6 bg-green-500' : 'translate-x-0 bg-red-500'}`}></div>
                            </button>
                        </div>
                        <button onClick={() => { setActiveTab('books'); setMobileMenuOpen(false); }} className="block w-full text-left font-bold text-sm text-red-400">DATABASE</button>
                        <button onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} className="block w-full text-left font-bold text-sm text-red-400">USER BASE</button>
                        <hr className="border-gray-700" />
                        <Link to="/" className="block font-bold text-xs opacity-50">PUBLIC GRID</Link>
                        <button onClick={logout} className="block font-bold text-xs opacity-50">LOGOUT</button>
                    </div>
                )}
            </header>

            <div className="max-w-7xl mx-auto pt-32 pb-12 px-6">
                {/* Overview Stats - Scrollable on mobile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">System Nodes</span>
                            <BookOpen className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{books.length}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">Total Traffic</span>
                            <Activity className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{books.reduce((acc, b) => acc + b.views, 0)}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold opacity-40">Active Users</span>
                            <Users className="text-red-500" size={16} />
                        </div>
                        <div className="text-3xl font-black">{users.length}</div>
                    </div>
                </div>

                {activeTab === 'books' && (
                    <div className="space-y-8">
                        {/* Systems Chart - Only render on desktop to avoid Recharts 0x0 warning */}
                        <div className="hidden md:block bg-gray-800 border border-gray-700 p-6 rounded-lg">
                            <h2 className="text-sm font-bold mb-6 text-gray-400 flex items-center gap-2">
                                <BarChart3 size={14} /> TRAFFIC_VISUALIZER
                            </h2>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={books.slice(0, 10).reverse()}>
                                        <defs>
                                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="title" hide />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none' }} />
                                        <Area type="monotone" dataKey="views" stroke="#ef4444" fillOpacity={1} fill="url(#colorViews)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Books List */}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-700">
                                <h2 className="text-lg font-bold">GLOBAL DATABASE</h2>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-900/50">
                                        <tr>
                                            <th className="p-4 opacity-50">ID</th>
                                            <th className="p-4 opacity-50">TITLE</th>
                                            <th className="p-4 opacity-50">AUTHOR</th>
                                            <th className="p-4 opacity-50">UPLOADER</th>
                                            <th className="p-4 opacity-50">VIEWS</th>
                                            <th className="p-4 opacity-50">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {books.map(book => (
                                            <tr key={book.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 opacity-50">#{book.id}</td>
                                                <td className="p-4 font-bold max-w-[200px] truncate">{book.title}</td>
                                                <td className="p-4">{book.author}</td>
                                                <td className="p-4 text-blue-400">@{book.user?.username}</td>
                                                <td className="p-4 text-red-400 font-bold">{book.views}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <Link to={`/read/${book.slug}`} target="_blank" className="bg-gray-700 hover:bg-white hover:text-black px-2 py-1 rounded">View</Link>
                                                        <button onClick={() => handleDeleteBook(book.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-2 py-1 rounded">Del</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="md:hidden divide-y divide-gray-700">
                                {books.map(book => (
                                    <div key={book.id} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sm line-clamp-2">{book.title}</h3>
                                            <span className="text-[10px] bg-gray-700 px-1 rounded">#{book.id}</span>
                                        </div>
                                        <div className="flex justify-between text-xs opacity-60">
                                            <span>By {book.author}</span>
                                            <span className="text-blue-400">@{book.user?.username}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-xs font-bold text-red-500">{book.views} Views</span>
                                            <div className="flex gap-2">
                                                <Link to={`/read/${book.slug}`} className="text-[10px] bg-gray-700 px-3 py-2 rounded">VIEW</Link>
                                                <button onClick={() => handleDeleteBook(book.id)} className="text-[10px] bg-red-900/50 text-red-200 px-3 py-2 rounded">DELETE</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-lg font-bold">USER MANAGEMENT</h2>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-900/50">
                                    <tr>
                                        <th className="p-4 opacity-50">ID</th>
                                        <th className="p-4 opacity-50">USERNAME</th>
                                        <th className="p-4 opacity-50">ROLE</th>
                                        <th className="p-4 opacity-50">JOINED</th>
                                        <th className="p-4 opacity-50">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 opacity-50">#{user.id}</td>
                                            <td className="p-4 font-bold text-lg">{user.username}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-red-500 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 opacity-60">{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleResetPassword(user.id)} className="flex items-center gap-1 bg-gray-700 hover:bg-white hover:text-black px-3 py-1 rounded">
                                                        <Lock size={12} /> Reset Pwd
                                                    </button>
                                                    {user.role !== 'ADMIN' && (
                                                        <button onClick={() => handleDeleteUser(user.id)} className="flex items-center gap-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1 rounded">
                                                            <UserX size={12} /> Ban
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden divide-y divide-gray-700">
                            {users.map(user => (
                                <div key={user.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-lg">{user.username}</h3>
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.isBanned ? 'bg-red-900/50 text-red-200' : 'bg-green-500/20 text-green-400'}`}>
                                                {user.isBanned ? 'BANNED' : 'ACTIVE'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-red-500 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs opacity-50 space-y-1">
                                        <div>Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                                        <div>Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
                                        <div>IP: {user.lastLoginIp || '-'}</div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => handleResetPassword(user.id)} className="flex-1 bg-gray-700 p-2 rounded text-xs font-bold text-center">
                                            Reset Password
                                        </button>
                                        {user.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => handleBanToggle(user)}
                                                className={`flex-1 p-2 rounded text-xs font-bold text-center ${user.isBanned ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}
                                            >
                                                {user.isBanned ? 'Unban User' : 'Ban User'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
