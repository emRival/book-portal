import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
    if (!isOpen) return null;

    const role = localStorage.getItem('role');
    const isAdmin = role === 'ADMIN';

    // Theme Configuration
    const theme = isAdmin ? {
        container: "bg-gray-900 border border-gray-700 text-white shadow-2xl shadow-red-900/20",
        closeBtn: "text-gray-500 hover:text-white",
        icon: isDanger ? "text-red-500" : "text-blue-500",
        message: "text-gray-300",
        confirmBtn: isDanger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white",
        cancelBtn: "bg-gray-800 hover:bg-gray-700 text-gray-300",
    } : {
        container: "bg-white border border-white/10 technical-glow text-black",
        closeBtn: "text-black/40 hover:text-red-500",
        icon: isDanger ? "text-red-600" : "text-cobalt-primary",
        message: "text-gray-600 font-mono",
        confirmBtn: isDanger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-black hover:bg-cobalt-deep text-white",
        cancelBtn: "bg-gray-100 hover:bg-gray-200 text-gray-600",
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm p-6 relative ${theme.container}`}>
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 transition-colors ${theme.closeBtn}`}
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-black mb-4 flex items-center gap-2 tracking-tighter uppercase">
                    <AlertTriangle size={20} className={theme.icon} />
                    {title}
                </h2>

                <p className={`text-sm mb-8 leading-relaxed ${theme.message}`}>
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className={`flex-1 py-3 font-bold text-xs uppercase tracking-widest transition-colors ${theme.cancelBtn}`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 font-bold text-xs uppercase tracking-widest transition-colors ${theme.confirmBtn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
