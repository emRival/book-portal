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

    // Theme Configuration
    const theme = isAdmin ? {
        container: "bg-gray-900 border border-gray-700 text-white shadow-2xl shadow-red-900/20",
        closeBtn: "text-gray-500 hover:text-white",
        icon: "text-red-500",
        inputLabel: "text-gray-400",
        input: "bg-gray-800 border-gray-700 text-white focus:border-red-500 placeholder-gray-600",
        button: "bg-red-600 hover:bg-red-700 text-white",
        error: "bg-red-900/30 text-red-200 border-red-900/50",
        success: "bg-green-900/30 text-green-200 border-green-900/50"
    } : {
        container: "bg-white border border-white/10 technical-glow text-black",
        closeBtn: "text-black/40 hover:text-red-500",
        icon: "text-cobalt-primary",
        inputLabel: "opacity-60",
        input: "bg-bg-soft border-black/10 text-black focus:border-cobalt-primary",
        button: "bg-black hover:bg-cobalt-deep text-white",
        error: "bg-red-50 text-red-600 border-red-100",
        success: "bg-green-50 text-green-600 border-green-100"
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md p-6 relative ${theme.container}`}>
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 transition-colors ${theme.closeBtn}`}
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tighter">
                    <Lock size={20} className={theme.icon} />
                    SECURITY_UPDATE
                </h2>

                {error && (
                    <div className={`text-xs font-mono p-3 mb-4 border uppercase ${theme.error}`}>
                        ERR: {error}
                    </div>
                )}

                {success && (
                    <div className={`text-xs font-mono p-3 mb-4 border uppercase ${theme.success}`}>
                        SUCCESS: {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${theme.inputLabel}`}>
                            Current Protocol (Old Password)
                        </label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className={`w-full p-3 font-mono text-sm border outline-none transition-colors ${theme.input}`}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${theme.inputLabel}`}>
                            New Protocol (New Password)
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`w-full p-3 font-mono text-sm border outline-none transition-colors ${theme.input}`}
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${theme.inputLabel}`}>
                            Verify New Protocol
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full p-3 font-mono text-sm border outline-none transition-colors ${theme.input}`}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 font-bold tracking-widest uppercase transition-colors text-xs disabled:opacity-50 mt-6 ${theme.button}`}
                    >
                        {loading ? 'UPDATING...' : 'EXECUTE UPDATE'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
