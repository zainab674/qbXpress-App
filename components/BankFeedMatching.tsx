import React, { useState, useEffect } from 'react';
import { Transaction, Account, BankTransaction } from '../types';
import * as api from '../services/api';

interface Props {
    transactions: Transaction[];
    accounts: Account[];
    bankFeeds: BankTransaction[];
    handlers: {
        onSaveTransaction: (tx: any) => Promise<void>;
        refreshData: () => Promise<void>;
    };
    onClose: () => void;
}

const BankFeedMatching: React.FC<Props> = ({ transactions, accounts, bankFeeds, handlers, onClose }) => {
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);

    useEffect(() => {
        // Initialize state with UNMATCHED bank feeds
        setBankTransactions(bankFeeds.filter(f => f.status === 'UNMATCHED' || f.status === 'FOR_REVIEW'));
    }, [bankFeeds]);

    const handleMatch = async (btId: string, txId: string) => {
        try {
            await api.categorizeBankTransaction({
                transactionId: btId,
                categoryId: txId, // Using categoryId field for the target txId
                action: 'MATCH'
            });
            setBankTransactions(prev => prev.filter(b => b.id !== btId));
            await handlers.refreshData();
        } catch (err) {
            alert("Failed to complete match.");
        }
    };

    const isNearDate = (date1: string, date2: string) => {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
        return diffDays <= 7; // Within 7 days
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none text-gray-900 border border-gray-400 shadow-2xl">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">🏦 Bank Feed Matching Center</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded font-bold">✕</button>
            </div>

            <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-hidden bg-[#e4e9f2]">
                <div className="flex flex-col border-2 border-slate-300 rounded shadow-xl bg-white overflow-hidden">
                    <div className="bg-slate-200 p-2 text-[10px] font-black text-slate-500 uppercase border-b border-slate-300">Downloaded / Imported from Bank</div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b-2 border-slate-200 text-slate-500 font-black uppercase text-[10px] z-10">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bankTransactions.map(bt => (
                                    <tr key={bt.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="p-3 text-slate-500 font-medium">{bt.date}</td>
                                        <td className="p-3 font-bold text-slate-900 italic tracking-tight">{bt.description}</td>
                                        <td className={`p-3 text-right font-black text-sm ${bt.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {bt.amount < 0 ? `- $${Math.abs(bt.amount).toFixed(2)}` : `+ $${bt.amount.toFixed(2)}`}
                                        </td>
                                        <td className="p-3">
                                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pending</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col border-2 border-slate-300 rounded shadow-xl bg-white overflow-hidden">
                    <div className="bg-slate-800 p-2 text-[10px] font-black text-slate-400 uppercase border-b border-black">Suggested Matches in QuickBooks</div>
                    <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-100 custom-scrollbar">
                        {bankTransactions.map(bt => {
                            if (bt.matchedId) return null;
                            const potential = transactions.filter(t =>
                                Math.abs(t.total) === Math.abs(bt.amount) &&
                                isNearDate(t.date, bt.date)
                            );
                            return (
                                <div key={bt.id} className="border-2 border-white rounded-lg p-4 bg-white shadow-md">
                                    <div className="text-[10px] text-slate-400 font-black uppercase mb-3 flex justify-between">
                                        <span>RECONCILING: {bt.description}</span>
                                        <span className="text-slate-900">${Math.abs(bt.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {potential.length > 0 ? (
                                            potential.map(t => (
                                                <div key={t.id} className="flex justify-between items-center bg-blue-50 border-2 border-blue-100 p-3 rounded-lg hover:border-blue-500 transition-all cursor-default group">
                                                    <div>
                                                        <div className="text-xs font-black text-blue-900 group-hover:text-blue-600">{t.type} #{t.refNo}</div>
                                                        <div className="text-[10px] text-blue-500 font-bold">{t.date} • Total: ${t.total.toFixed(2)}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleMatch(bt.id, t.id)}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded font-black text-[10px] hover:bg-black shadow-lg transition-all uppercase tracking-widest"
                                                    >
                                                        Confirm Match
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-6 text-center">
                                                <div className="text-3xl mb-2 opacity-20">🔎</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No matching transactions found</div>

                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-3 bg-gray-200 border-t border-gray-400 flex justify-end gap-2">
                <button onClick={onClose} className="bg-gray-300 px-4 py-1 border border-gray-400 text-xs font-bold rounded">Cancel All</button>
                <button onClick={onClose} className="bg-blue-800 text-white px-6 py-1 border border-blue-900 text-xs font-bold rounded shadow-md">Finished</button>
            </div>
        </div>
    );
};

export default BankFeedMatching;
