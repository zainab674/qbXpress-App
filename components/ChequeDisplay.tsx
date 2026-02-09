
import React from 'react';
import { Transaction, Vendor, Account, QBClass } from '../types';

interface ChequeDisplayProps {
    cheque: Transaction;
    vendor: Vendor | undefined;
    accounts: Account[];
    classes: QBClass[];
    onClose: () => void;
}

const ChequeDisplay: React.FC<ChequeDisplayProps> = ({ cheque, vendor, accounts, classes, onClose }) => {
    const bankAccount = accounts.find(a => a.id === cheque.bankAccountId);

    // Number to words conversion for the amount line
    const numberToWords = (num: number): string => {
        if (num === 0) return 'Zero';
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const intPart = Math.floor(num);
        const cents = Math.round((num - intPart) * 100);

        let result = '';
        if (intPart >= 1000) {
            result += ones[Math.floor(intPart / 1000)] + ' Thousand ';
        }
        const hnd = Math.floor((intPart % 1000) / 100);
        if (hnd > 0) result += ones[hnd] + ' Hundred ';

        const rem = intPart % 100;
        if (rem < 20) result += ones[rem];
        else result += tens[Math.floor(rem / 10)] + (rem % 10 !== 0 ? '-' + ones[rem % 10] : '');

        return `${result.trim()} and ${cents}/100`;
    };

    return (
        <div className="bg-[#f0f3f6] h-full flex flex-col font-sans overflow-hidden">
            {/* Header / Toolbar */}
            <div className="bg-white border-b border-gray-300 p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Check Display</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Journal Entry #{cheque.refNo}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="bg-white border-2 border-slate-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        Print Check
                    </button>
                    <button onClick={onClose} className="bg-slate-900 text-white px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
                        Close
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#eef2f5]">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* The Visual Cheque */}
                    <div className="bg-[#fffdf0] rounded-sm shadow-2xl border-2 border-gray-300 p-12 relative overflow-hidden min-h-[400px]">
                        {/* Security check pattern subtle overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        <div className="flex justify-between items-start relative z-10">
                            <div className="space-y-6">
                                <div>
                                    <div className="text-lg font-black text-slate-900 italic tracking-tighter uppercase">{vendor?.companyName || 'My Company Name'}</div>
                                    <div className="text-xs text-slate-500 font-bold italic">123 Business Way, Suite 100</div>
                                </div>
                                <div className="mt-8 flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bank Account</span>
                                    <span className="text-sm font-black text-blue-900 italic">{bankAccount?.name || 'Unspecified Bank Account'}</span>
                                </div>
                            </div>

                            <div className="text-right space-y-4">
                                <div className="text-xl font-mono font-black text-slate-400">#{cheque.refNo}</div>
                                <div className="bg-white border-2 border-slate-100 p-4 rounded-xl shadow-inner text-right inline-block min-w-[150px]">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date</label>
                                    <div className="text-lg font-black text-slate-900 italic uppercase">
                                        {cheque.date}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payee Line */}
                        <div className="mt-12 flex items-end gap-4 border-b-2 border-slate-200 pb-2 relative z-10">
                            <label className="text-xs font-black text-blue-900 w-32 uppercase italic tracking-tighter">Pay to the Order of</label>
                            <div className="flex-1 text-2xl font-serif italic text-[#003366] font-bold">
                                {vendor?.name || 'Unknown Payee'}
                            </div>
                            <div className="bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3 rounded shadow-inner min-w-[180px]">
                                <span className="text-2xl font-black font-serif text-blue-900">$</span>
                                <div className="flex-1 text-2xl font-black font-mono text-right text-blue-900 tabular-nums">
                                    {cheque.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* Words Line */}
                        <div className="mt-6 flex items-end gap-2 text-lg font-serif italic border-b-2 border-slate-200 pb-1 text-slate-700 relative z-10">
                            <div className="flex-1 px-4">{numberToWords(cheque.total)} dollars</div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">DOLLARS</span>
                        </div>

                        <div className="mt-12 grid grid-cols-2 gap-12 relative z-10">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-300 uppercase block mb-1">Address</label>
                                    <div className="text-xs text-slate-500 font-bold italic whitespace-pre-line leading-relaxed border-l-2 border-slate-100 pl-4 py-1">
                                        {vendor?.address || 'No address on file'}
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 border-b-2 border-slate-100 pb-1">
                                    <label className="text-[10px] font-black text-slate-300 uppercase w-12">Memo</label>
                                    <div className="flex-1 text-xs font-bold text-slate-600 italic">
                                        {cheque.memo || 'Regular Check Payment'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end">
                                <div className="text-right border-t-4 border-slate-900 pt-1 italic font-serif text-slate-400 select-none text-xl font-black">
                                    Authorized Signature
                                </div>
                            </div>
                        </div>

                        {/* MICR Encoding Style (decorative) */}
                        <div className="mt-16 font-mono text-slate-300 text-lg tracking-[0.5em] flex justify-center opacity-40">
                            ⑆ 123456789 ⑈ 987654321 ⑆ 0000000000
                        </div>
                    </div>

                    {/* Table of Split Expenses */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">Expense Allocation</h3>
                            <span className="text-[10px] font-bold text-slate-400 italic">Account Distribution</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {cheque.items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-4 font-black">
                                            <div className="text-sm text-slate-900">
                                                {accounts.find(a => a.id === item.accountId)?.name || 'Direct Expense'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <p className="text-sm text-slate-500 font-medium italic">
                                                {item.description || '-'}
                                            </p>
                                        </td>
                                        <td className="px-8 py-4">
                                            {item.classId ? (
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-tighter shadow-sm">
                                                    {classes.find(c => c.id === item.classId)?.name || item.classId}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-8 py-4 text-sm font-black text-slate-900 text-right tabular-nums">
                                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {cheque.items.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-300 italic">No expense lines found.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-900 text-white">
                                    <td colSpan={3} className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest opacity-60">Total Cheque Amount</td>
                                    <td className="px-8 py-6 text-right text-2xl font-black italic tracking-tighter tabular-nums">
                                        ${cheque.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChequeDisplay;
