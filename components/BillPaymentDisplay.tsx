
import React from 'react';
import { Transaction, Vendor, Account } from '../types';

interface BillPaymentDisplayProps {
    payment: Transaction;
    vendor: Vendor | undefined;
    accounts: Account[];
    transactions: Transaction[];
    onClose: () => void;
}

const BillPaymentDisplay: React.FC<BillPaymentDisplayProps> = ({ payment, vendor, accounts, transactions, onClose }) => {
    const account = accounts.find(a => a.id === payment.bankAccountId);

    // Find all transactions (Bills) that were paid by this payment
    const paidBills = transactions.filter(t =>
        payment.appliedCreditIds?.includes(t.id) &&
        (t.type === 'BILL' || t.type === 'RECEIVE_ITEM')
    );

    // Find all Vendor Credits that were used in this payment
    const usedCredits = transactions.filter(t =>
        payment.appliedCreditIds?.includes(t.id) &&
        t.type === 'VENDOR_CREDIT'
    );

    return (
        <div className="bg-[#f0f3f6] h-full flex flex-col font-sans overflow-hidden">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Bill Payment (Check)</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Transaction Details</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border-2 border-slate-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        Print Check
                    </button>
                    <button onClick={onClose} className="bg-slate-900 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                        Close
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Main Info Card */}
                    <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-start">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Pay To The Order Of</label>
                                    <div className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{vendor?.name || 'Unknown Vendor'}</div>
                                    <div className="text-xs text-slate-400 font-medium mt-1 whitespace-pre-line leading-relaxed italic">{vendor?.address || 'No address on file'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Account</label>
                                        <div className="text-sm font-bold text-slate-700">{account?.name || 'Unspecified Account'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Payment Method</label>
                                        <div className="text-sm font-bold text-slate-700">{payment.paymentMethod || 'Check'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-6">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner inline-block min-w-[200px]">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amount Paid</label>
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                                        ${payment.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Date</label>
                                    <div className="text-sm font-black text-slate-900 uppercase italic">{payment.date}</div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Check Number</label>
                                    <div className="text-sm font-black text-slate-900 font-mono">#{payment.refNo}</div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Banner */}
                        <div className="bg-slate-900 px-10 py-4 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Bills Paid</span>
                                    <span className="text-sm font-black text-white">{paidBills.length}</span>
                                </div>
                                <div className="flex flex-col border-l border-slate-800 pl-8">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Credits Used</span>
                                    <span className="text-sm font-black text-white">{usedCredits.length}</span>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transaction Status: {payment.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bills Table Card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">Applied to Bills</h3>
                            <span className="text-[10px] font-bold text-slate-400 italic">Historical Record</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference #</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Original Amount</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amt. Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paidBills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-4 text-sm font-bold text-slate-600 tabular-nums">{bill.date}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bill.type === 'RECEIVE_ITEM' ? 'Item Receipt' : 'Bill'}</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-slate-900 italic font-mono">{bill.refNo}</td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-8 py-4 text-sm font-black text-blue-600 text-right tabular-nums">${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {usedCredits.map(credit => (
                                    <tr key={credit.id} className="bg-red-50/30">
                                        <td className="px-8 py-4 text-sm font-bold text-red-400 tabular-nums">{credit.date}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest italic tracking-tighter">Vendor Credit</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-red-500 italic font-mono">{credit.refNo}</td>
                                        <td className="px-8 py-4 text-sm font-bold text-red-300 text-right tabular-nums">${credit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-8 py-4 text-sm font-black text-red-600 text-right tabular-nums">-${credit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50">
                                    <td colSpan={4} className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Net Payment</td>
                                    <td className="px-8 py-6 text-right text-xl font-black text-slate-900 tabular-nums">${payment.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillPaymentDisplay;
