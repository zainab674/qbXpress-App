import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';

const PayrollConnect: React.FC = () => {
    const { isLoaded, activeCompanyId, companies } = useData();
    const [status, setStatus] = useState<'loading' | 'request' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');

    const query = new URLSearchParams(window.location.search);
    const callback = query.get('callback');
    const state = query.get('state');

    useEffect(() => {
        if (isLoaded) {
            if (!callback || !state) {
                setStatus('error');
                setError('Missing callback or state parameters.');
            } else {
                setStatus('request');
            }
        }
    }, [isLoaded, callback, state]);

    const handleAllow = () => {
        const token = localStorage.getItem('authToken');
        const company = companies.find(c => (c._id || c.id) === activeCompanyId);

        if (!token) {
            setStatus('error');
            setError('You must be logged into qbXpress to authorize this connection.');
            return;
        }

        // Build the redirect URL back to PayrollOS
        const redirectUrl = new URL(callback!);
        redirectUrl.searchParams.set('token', token);
        redirectUrl.searchParams.set('state', state!);
        if (company) {
            redirectUrl.searchParams.set('company_name', company.name);
            redirectUrl.searchParams.set('company_id', company._id || company.id);
        }

        setStatus('success');

        // In a real OAuth flow, we'd redirect. 
        // Since this is a popup, we just redirect the popup window.
        window.location.href = redirectUrl.toString();
    };

    const handleDeny = () => {
        window.close();
    };

    const company = companies.find(c => (c._id || c.id) === activeCompanyId);

    return (
        <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-[#1c1e26] rounded-2xl p-8 border border-white/10 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-bold">
                        QB
                    </div>
                    <div className="flex items-center px-4 text-gray-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl font-bold">
                        P
                    </div>
                </div>

                <h2 className="text-xl font-bold text-center mb-2">Connect to PayrollOS</h2>
                <p className="text-gray-400 text-center text-sm mb-8">
                    PayrollOS is requesting access to your qbXpress company data.
                </p>

                {status === 'loading' && (
                    <div className="text-center text-gray-500 animate-pulse">Loading authorization request...</div>
                )}

                {status === 'request' && (
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Company Access</div>
                            <div className="font-semibold text-blue-400">{company?.name || 'Your Active Company'}</div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-sm text-gray-300">
                                <div className="mt-1 text-emerald-500">✓</div>
                                <div>Read company profile and basic info</div>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-gray-300">
                                <div className="mt-1 text-emerald-500">✓</div>
                                <div>View your Chart of Accounts</div>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-gray-300">
                                <div className="mt-1 text-emerald-500">✓</div>
                                <div>Sync payroll journal entries</div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleDeny}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                            >
                                Deny
                            </button>
                            <button
                                onClick={handleAllow}
                                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Allow Access
                            </button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="text-red-400 mb-4">{error}</div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-bold"
                        >
                            Go to qbXpress
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center text-emerald-400">
                        Authorization successful! Redirecting...
                    </div>
                )}
            </div>

            <div className="mt-8 text-center text-gray-600 text-xs">
                Only authorize applications you trust. You can disconnect this integration at any time from your qbXpress settings.
            </div>
        </div>
    );
};

export default PayrollConnect;
