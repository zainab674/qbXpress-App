import React from 'react';
import { Transaction, Vendor } from '../../types';

interface BillTableProps {
    bills: Transaction[];
    vendors: Vendor[];
    onOpenBill: (billId: string) => void;
    onPayBill: (billId: string) => void;
    searchTerm: string;
}

const BillTable: React.FC<BillTableProps> = ({ bills, vendors, onOpenBill, onPayBill, searchTerm }) => {
    const filteredBills = bills.filter(bill => {
        const vendor = vendors.find(v => v.id === bill.entityId);
        const searchStr = `${vendor?.name || ''} ${bill.refNo} ${bill.total}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ref No</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredBills.map(bill => {
                        const vendor = vendors.find(v => v.id === bill.entityId);
                        const isOverdue = bill.dueDate && new Date(bill.dueDate) < new Date() && bill.status !== 'PAID';

                        return (
                            <tr key={bill.id} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-700 text-sm">{bill.date}</td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">{bill.refNo}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                            {vendor?.name || 'Unknown Vendor'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Vendor ID: {bill.entityId.slice(0, 8)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block w-fit uppercase tracking-tighter ${bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                                isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {bill.status === 'PAID' ? 'Paid' : (isOverdue ? 'Overdue' : 'Open')}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500">
                                            {bill.dueDate || 'N/A'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm font-black text-slate-900">
                                        ${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => onOpenBill(bill.id)}
                                        className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 text-blue-600"
                                        title="View Record"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    {bill.status !== 'PAID' && (
                                        <button
                                            onClick={() => onPayBill(bill.id)}
                                            className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-200 transition-all active:scale-95 text-emerald-600"
                                            title="Pay Bill"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredBills.length === 0 && (
                <div className="p-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No bills found</p>
                </div>
            )}
        </div>
    );
};

export default BillTable;
