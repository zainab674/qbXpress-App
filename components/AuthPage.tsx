import React, { useState } from 'react';
import { login, signup } from '../services/api';

interface AuthPageProps {
    initialMode?: 'login' | 'signup';
    onLoginSuccess: () => void;
    onSignupSuccess: () => void;
    onBackToLanding: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login', onLoginSuccess, onSignupSuccess, onBackToLanding }) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (mode === 'login') {
                await login({ email, password });
                onLoginSuccess();
            } else {
                await signup({ username, email, password });
                onSignupSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#54738c] flex flex-col items-center justify-center p-6 font-sans">
            <div className="mb-8 flex flex-col items-center cursor-pointer" onClick={onBackToLanding}>
                <div className="w-12 h-12 bg-[#0077c5] rounded-lg shadow-xl flex items-center justify-center text-white font-bold text-3xl mb-2">Q</div>
                <h1 className="text-white text-2xl font-bold tracking-tight">qbXpress</h1>
            </div>

            <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-gray-300">
                <div className="flex border-b">
                    <button
                        onClick={() => setMode('login')}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'login' ? 'text-[#0077c5] border-b-2 border-[#0077c5] bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                    >
                        SIGN IN
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'signup' ? 'text-[#0077c5] border-b-2 border-[#0077c5] bg-white' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                    >
                        CREATE ACCOUNT
                    </button>
                </div>

                <form className="p-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-xs font-bold animate-pulse">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">Username</label>
                                <input
                                    required
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-[#0077c5] focus:border-[#0077c5] outline-none transition-all text-sm"
                                    placeholder="yourname"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">Email Address</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-[#0077c5] focus:border-[#0077c5] outline-none transition-all text-sm"
                                placeholder="name@company.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">Password</label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-[#0077c5] focus:border-[#0077c5] outline-none transition-all text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {mode === 'login' && (
                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800">
                                <input type="checkbox" className="rounded text-[#0077c5]" />
                                Remember me
                            </label>
                            <a href="#" className="text-[#0077c5] font-bold hover:underline">Forgot password?</a>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#16a34a] text-white py-3 rounded-md font-bold text-sm hover:bg-[#15803d] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            mode === 'login' ? 'SIGN IN' : 'GET STARTED'
                        )}
                    </button>

                    {mode === 'signup' && (
                        <p className="text-[10px] text-gray-500 text-center leading-relaxed italic">
                            By creating an account, you agree to our Terms of Service and Privacy Policy.
                            qbXpress is for demonstration purposes.
                        </p>
                    )}
                </form>
            </div>

            <div className="mt-8 text-white/70 text-sm">
                <button onClick={onBackToLanding} className="hover:text-white transition-colors">
                    ← Back to home
                </button>
            </div>
        </div>
    );
};

export default AuthPage;
