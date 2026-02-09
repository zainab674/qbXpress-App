import React from 'react';
import { Transaction, Vendor, Account, QBClass, Item } from '../types';

interface PODisplayProps {
    po: Transaction;
    vendor: Vendor | undefined;
    items: Item[];
    accounts: Account[];
    classes: QBClass[];
    onClose: () => void;
    onConvertToBill?: (po: Transaction) => void;
}

const PODisplay: React.FC<PODisplayProps> = ({ po, vendor, items, accounts, classes, onClose, onConvertToBill }) => {
    const totalAmount = po.total.toLocaleString(undefined, { minimumFractionDigits: 2 });

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
                            Back
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {onConvertToBill && po.status === 'OPEN' && (
                            <button
                                onClick={() => onConvertToBill(po)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                                Convert to Bill
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print PO
                        </button>
                    </div>
                </div>

                {/* PO Content */}
                <div className="p-16 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2">P.O.</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs pl-8">Purchase Order</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {vendor?.name || 'Unknown Vendor'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {vendor?.address ? (
                                    vendor.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                                {vendor?.phone && <p>Tel: {vendor.phone}</p>}
                                {vendor?.email && <p>Email: {vendor.email}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-12 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{po.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expected Date</p>
                            <p className="text-lg font-black italic text-slate-900">
                                {po.dueDate || po.date}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">P.O. Number</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{po.refNo}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Item / Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {po.items.map((item, idx) => {
                                    const serviceItem = items.find(i => i.id === item.itemId);
                                    return (
                                        <tr key={idx} className="group">
                                            <td className="py-6 pr-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-sm">
                                                        {serviceItem?.name || item.itemId || 'Item'}
                                                    </span>
                                                    <p className="text-[11px] text-slate-500 font-medium italic mt-1">
                                                        {item.description || '-'}
                                                    </p>
                                                    {item.classId && (
                                                        <span className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-tighter px-1.5 py-0.5 bg-blue-50 w-fit rounded">
                                                            Class: {classes.find(c => c.id === item.classId)?.name || item.classId}
                                                        </span>
                                                    )}
                                                </div>
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
                        <div className="flex justify-between items-center bg-slate-100 p-8 rounded shadow-inner relative overflow-hidden">
                            {po.status === 'CLOSED' && (
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-8 border-slate-600/20 text-slate-600/20 text-8xl font-black px-12 py-4 pointer-events-none uppercase">
                                    CLOSED
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total Order Value</p>
                                <p className="text-sm font-bold text-slate-500 italic">Pre-authorized Purchase Order</p>
                            </div>
                            <div className="text-right">
                                <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                    ${totalAmount}
                                </span>
                            </div>
                        </div>
                        {po.memo && (
                            <div className="mt-8 border-l-4 border-slate-200 pl-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendor Instructions</p>
                                <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{po.memo}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">QB</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Logistics ID</p>
                            <p className="text-xs font-mono">{po.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PODisplay;
