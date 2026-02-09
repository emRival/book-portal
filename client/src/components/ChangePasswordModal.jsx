import React, { useState } from 'react';
import axios from 'axios';
import { Lock, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const role = localStorage.getItem('role');
    const isAdmin = role === 'ADMIN';

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/auth/change-password`,
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
                setSuccess('');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md p-6 relative technical-glow border border-white/10">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-black/40 hover:text-red-500 transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tighter">
                    <Lock size={20} className="text-cobalt-primary" />
                    SECURITY_UPDATE
                </h2>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-mono p-3 mb-4 border border-red-100 uppercase">
                        ERR: {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-600 text-xs font-mono p-3 mb-4 border border-green-100 uppercase">
                        SUCCESS: {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">
                            Current Protocol (Old Password)
                        </label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm focus:border-cobalt-primary outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">
                            New Protocol (New Password)
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm focus:border-cobalt-primary outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">
                            Verify New Protocol
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-bg-soft border border-black/10 p-2 font-mono text-sm focus:border-cobalt-primary outline-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-3 font-bold tracking-widest uppercase hover:bg-cobalt-deep transition-colors text-xs disabled:opacity-50 mt-4"
                    >
                        {loading ? 'UPDATING...' : 'EXECUTE UPDATE'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
