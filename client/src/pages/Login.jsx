import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Turnstile from 'react-turnstile';
import { API_BASE_URL } from '../config';
import { encryptPayload } from '../utils/crypto';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [cfToken, setCfToken] = useState('');
    const [error, setError] = useState('');
    const [registrationEnabled, setRegistrationEnabled] = useState(true);
    const navigate = useNavigate();

    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/auth/settings`)
            .then(res => {
                setRegistrationEnabled(res.data.registrationEnabled);
                // If currently registering but disabled, switch back to login
                if (!res.data.registrationEnabled) setIsRegistering(false);
            })
            .catch(() => setRegistrationEnabled(true));
    }, []);

    const validateInput = () => {
        if (!username.trim() || !password) {
            setError('Username and password are required');
            return false;
        }
        if (isRegistering) {
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                return false;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                setError('Username can only contain letters, numbers, and underscores');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateInput()) return;

        const endpoint = isRegistering ? 'register' : 'login';

        try {
            if (!cfToken) {
                setError('Please complete the CAPTCHA check.');
                return;
            }
            const payload = await encryptPayload({ username, password, cfToken });
            const res = await axios.post(`${API_BASE_URL}/auth/${endpoint}`, payload);

            if (isRegistering) {
                // Register success - Backend now returns token directly
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('username', res.data.username);
                localStorage.setItem('role', res.data.role);

                if (res.data.role === 'ADMIN') navigate('/admin-dashboard');
                else navigate('/dashboard');
            } else {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('username', res.data.username);
                localStorage.setItem('role', res.data.role);

                if (res.data.role === 'ADMIN') navigate('/admin-dashboard');
                else navigate('/dashboard');
            }
        } catch (err) {
            // Display backend validation errors if available
            const backendError = err.response?.data?.details?.[0]?.message || err.response?.data?.error || 'Authentication failed';
            setError(backendError);
            setCfToken(''); // Clear token to force re-verification
        }
    };

    return (
        <div className="min-h-screen blueprint-bg flex items-center justify-center p-6">
            <div className="vellum-stack w-full max-w-md p-10 technical-glow bg-white text-center relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center transition-all group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mr-1 group-hover:-translate-x-1 transition-transform"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                    Back
                </button>

                <div className="border-b-2 border-black/10 pb-6 mb-8">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2">Identity Protocol</span>
                    <h2 className="text-3xl font-extrabold tracking-tighter">{isRegistering ? 'REGISTRATION' : 'ACCESS CONTROL'}</h2>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-mono p-3 mb-6 border border-red-100">
                        ERR: {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Username</label>
                        <input
                            type="text"
                            className="w-full bg-bg-soft border border-black/10 p-3 font-mono text-sm focus:outline-none focus:border-cobalt-primary transition-colors"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Password</label>
                        <input
                            type="password"
                            className="w-full bg-bg-soft border border-black/10 p-3 font-mono text-sm focus:outline-none focus:border-cobalt-primary transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-center mb-6">
                        <Turnstile
                            sitekey={import.meta.env.VITE_CLOUDFLARE_SITE_KEY || "0x4AAAAAAAAmHwXnF2tXn-vD"} // Use test key if not set
                            onVerify={(token) => setCfToken(token)}
                            theme="light"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-black text-white py-4 font-bold tracking-widest uppercase hover:bg-cobalt-deep transition-colors text-xs"
                    >
                        {isRegistering ? 'Confirm Registration' : 'Authenticate'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-black/5">
                    {registrationEnabled ? (
                        <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-mono opacity-40 hover:opacity-100 underline">
                            {isRegistering ? 'Return to Login' : 'Initialize New Identity (Register)'}
                        </button>
                    ) : (
                        <p className="text-[10px] font-mono opacity-40 italic">
                            Registration is currently closed by the administrator.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
