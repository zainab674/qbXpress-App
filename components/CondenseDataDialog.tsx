import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCondense: (cutoffDate: string) => Promise<void>;
}

const CondenseDataDialog: React.FC<Props> = ({ isOpen, onClose, onCondense }) => {
    const [cutoffDate, setCutoffDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!cutoffDate) {
            setError('Please select a cutoff date.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await onCondense(cutoffDate);
            setCutoffDate('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Condense failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[460px] rounded-sm flex flex-col overflow-hidden">
                {/* Title bar */}
                <div className="bg-gradient-to-r from-[#003366] to-[#0055aa] text-white px-3 py-2 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">Condense Data</span>
                    <button onClick={onClose} className="hover:bg-red-500 rounded px-1.5 transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="p-5 bg-white space-y-4">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-700 font-bold text-lg">!</span>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                            <p className="font-semibold mb-1">Permanently remove old transactions</p>
                            <p>All transactions dated <strong>before</strong> the cutoff date will be permanently deleted. This cannot be undone.</p>
                            <p className="mt-1 text-gray-500">Tip: Create a backup before condensing.</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Remove all transactions before:
                        </label>
                        <input
                            type="date"
                            value={cutoffDate}
                            onChange={e => { setCutoffDate(e.target.value); setError(''); }}
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#003366]"
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {error && <p className="text-red-600 text-xs">{error}</p>}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#e0e0e0] px-4 py-3 flex justify-end gap-2 border-t border-gray-300">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-5 py-1.5 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || !cutoffDate}
                        className="px-6 py-1.5 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Condensing...' : 'Condense Data'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CondenseDataDialog;
