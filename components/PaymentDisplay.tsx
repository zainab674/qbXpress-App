
import React from 'react';
import { Transaction, Customer } from '../types';

interface PaymentDisplayProps {
    payment: Transaction;
    customer: Customer | undefined;
    transactions: Transaction[];
    onClose: () => void;
}

const PaymentDisplay: React.FC<PaymentDisplayProps> = ({ payment, customer, transactions, onClose }) => {
    // Find all transactions (Invoices) that were paid by this payment
    const paidInvoices = transactions.filter(t =>
        payment.appliedCreditIds?.includes(t.id) &&
        (t.type === 'INVOICE' || t.type === 'SALES_RECEIPT')
    );

    // Find all Credits that were used in this payment (if applicable for customers)
    const usedCredits = transactions.filter(t =>
        payment.appliedCreditIds?.includes(t.id) &&
        t.type === 'CREDIT_MEMO'
    );

    const totalApplied = paidInvoices.reduce((sum, inv) => sum + inv.total, 0) - usedCredits.reduce((sum, cr) => sum + cr.total, 0);
    const unappliedAmount = payment.total - totalApplied;

    return (
        <div className="bg-[#f0f3f6] h-full flex flex-col font-sans overflow-hidden">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Customer Payment</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Receipt Details</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="bg-white border-2 border-slate-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        Print Receipt
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
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Received From</label>
                                    <div className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{customer?.companyName || customer?.name || 'Unknown Customer'}</div>
                                    <div className="text-xs text-slate-400 font-medium mt-1 whitespace-pre-line leading-relaxed italic">{customer?.address || 'No address on file'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Payment Method</label>
                                        <div className="text-sm font-bold text-slate-700">{payment.paymentMethod || 'Check'}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Reference Number</label>
                                        <div className="text-sm font-black text-slate-900 font-mono">#{payment.refNo}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-6">
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-inner inline-block min-w-[200px]">
                                    <label className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest block mb-1">Amount Received</label>
                                    <div className="text-4xl font-black text-emerald-900 tracking-tighter tabular-nums">
                                        ${payment.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Date</label>
                                    <div className="text-sm font-black text-slate-900 uppercase italic">{payment.date}</div>
                                </div>
                            </div>
                        </div>

                        {/* Summary Banner */}
                        <div className="bg-slate-900 px-10 py-4 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Invoices Applied</span>
                                    <span className="text-sm font-black text-white">{paidInvoices.length}</span>
                                </div>
                                <div className="flex flex-col border-l border-slate-800 pl-8">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Credits Applied</span>
                                    <span className="text-sm font-black text-white">{usedCredits.length}</span>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transaction Cleared</span>
                            </div>
                        </div>
                    </div>

                    {/* Invoices Table Card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">Applied To Invoices</h3>
                            <span className="text-[10px] font-bold text-slate-400 italic">Accounting Ledger</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice #</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Original Amount</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paidInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-4 text-sm font-bold text-slate-600 tabular-nums">{inv.date}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-slate-900 italic font-mono">{inv.refNo}</td>
                                        <td className="px-8 py-4 text-sm font-bold text-slate-400 text-right tabular-nums">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-8 py-4 text-sm font-black text-emerald-600 text-right tabular-nums">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {usedCredits.map(credit => (
                                    <tr key={credit.id} className="bg-amber-50/30">
                                        <td className="px-8 py-4 text-sm font-bold text-amber-600 tabular-nums">{credit.date}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic tracking-tighter">Credit Memo</span>
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-amber-700 italic font-mono">{credit.refNo}</td>
                                        <td className="px-8 py-4 text-sm font-bold text-amber-400 text-right tabular-nums">${credit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-8 py-4 text-sm font-black text-amber-800 text-right tabular-nums">-${credit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                {paidInvoices.length === 0 && usedCredits.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">This payment was not applied to any specific invoices.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50">
                                    <td colSpan={4} className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applied</td>
                                    <td className="px-8 py-6 text-right text-xl font-black text-slate-900 tabular-nums">${totalApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                                {unappliedAmount > 0.01 && (
                                    <tr className="bg-amber-50/50">
                                        <td colSpan={4} className="px-8 py-4 text-right text-[10px] font-black text-amber-600 uppercase tracking-widest">Unapplied (Credit Balance)</td>
                                        <td className="px-8 py-4 text-right text-lg font-black text-amber-700 tabular-nums">${unappliedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentDisplay;
