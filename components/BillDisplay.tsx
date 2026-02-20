import React from 'react';
import { Transaction, Vendor, Account, QBClass } from '../types';

interface BillDisplayProps {
    bill: Transaction;
    vendor: Vendor | undefined;
    accounts: Account[];
    classes: QBClass[];
    onClose: () => void;
}

const BillDisplay: React.FC<BillDisplayProps> = ({ bill, vendor, accounts, classes, onClose }) => {
    const totalAmount = bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 });
    const isReceipt = bill.type === 'RECEIVE_ITEM';
    const typeLabel = isReceipt ? 'ITEM RECEIPT' : 'BILL';

    return (
        <div className="h-full bg-slate-100 p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1056px] flex flex-col border border-slate-300">
                {/* Header / Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="text-slate-600 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Center
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print {isReceipt ? 'Receipt' : 'Bill'}
                        </button>
                    </div>
                </div>

                {/* Bill Content */}
                <div className="p-16 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2">{typeLabel}</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs pl-8">{isReceipt ? 'Inventory Entry' : 'Accounts Payable'}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {vendor?.name || 'Unknown Vendor'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {bill.BillAddr?.Line1 ? (
                                    bill.BillAddr.Line1.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : vendor?.address ? (
                                    vendor.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                                {vendor?.phone && <p>Tel: {vendor.phone}</p>}
                                {vendor?.email && <p>Email: {vendor.email}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isReceipt ? 'Receipt Date' : 'Bill Date'}</p>
                            <p className="text-lg font-black text-slate-900 italic">{bill.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
                            <p className={`text-lg font-black italic ${bill.status === 'PAID' ? 'text-green-600' : 'text-red-600'}`}>
                                {bill.dueDate || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Terms</p>
                            <p className="text-lg font-black text-slate-900 italic">{bill.terms || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reference No.</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{bill.refNo}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Account / Item</th>
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bill.items.map((item, idx) => {
                                    const account = accounts.find(a => a.id === item.accountId);
                                    return (
                                        <tr key={idx} className="group">
                                            <td className="py-6 pr-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-sm">
                                                        {account?.name || item.itemId || 'General Expense'}
                                                    </span>
                                                    {item.classId && (
                                                        <span className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-tighter px-1.5 py-0.5 bg-blue-50 w-fit rounded">
                                                            Class: {classes.find(c => c.id === item.classId)?.name || item.classId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <p className="text-sm text-slate-600 font-medium italic">
                                                    {item.description || '-'}
                                                </p>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className="text-sm font-bold text-slate-400">{item.quantity}</span>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <span className="text-sm font-bold text-slate-400">
                                                    ${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-6 pl-4 text-right">
                                                <span className="text-sm font-black text-slate-900">
                                                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto border-t-8 border-slate-900 pt-12">
                        <div className="bg-slate-50 p-8 rounded border border-slate-200 shadow-sm mb-12">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bill Total</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-slate-600">
                                        ${totalAmount}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-100 -mx-8 p-8 rounded-b relative overflow-hidden">
                                {bill.status === 'PAID' && (
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-8 border-green-600/20 text-green-600/20 text-8xl font-black px-12 py-4 pointer-events-none uppercase">
                                        PAID
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total {isReceipt ? 'Receipt' : 'Bill'} Amount</p>
                                    <p className="text-sm font-bold text-slate-500 italic">{isReceipt ? 'Pending Bill Creation' : 'Paid via Accounts Payable'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                        ${totalAmount}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-8 -mx-8 bg-slate-200/50">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Balance Due</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-blue-900 font-mono">
                                        ${((vendor?.balance || 0) + bill.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                {bill.memo && (
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Remarks</p>
                                        <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{bill.memo}</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                {bill.attachments && bill.attachments.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Attachments</p>
                                        <div className="flex flex-col gap-2">
                                            {bill.attachments.map((a, i) => (
                                                <div key={i} className="text-xs text-blue-600 font-bold flex items-center gap-2">
                                                    <span>📎</span>
                                                    <span>{a.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">QB</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Document ID</p>
                            <p className="text-xs font-mono">{bill.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillDisplay;
