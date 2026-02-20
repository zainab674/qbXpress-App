
import React from 'react';
import { Transaction, Customer } from '../../types';

interface SOTableProps {
    sos: Transaction[];
    customers: Customer[];
    searchTerm: string;
    onOpenSO: (id: string) => void;
    onConvertToInvoice: (id: string) => void;
}

const SOTable: React.FC<SOTableProps> = ({ sos, customers, searchTerm, onOpenSO, onConvertToInvoice }) => {
    const filtered = sos.filter(so => {
        const customer = customers.find(c => c.id === so.entityId);
        const searchStr = `${customer?.name} ${so.refNo} ${so.total}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SO #</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(so => {
                            const customer = customers.find(c => c.id === so.entityId);
                            const isConverted = so.status === 'Converted';
                            return (
                                <tr
                                    key={so.id}
                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                                    onClick={() => onOpenSO(so.id)}
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic">{customer?.name || 'Unknown Customer'}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">C-ID: {so.entityId.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{so.refNo || '--'}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{so.date}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
                                            ${isConverted ? 'bg-emerald-100 text-emerald-700' :
                                                so.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' :
                                                    'bg-blue-100 text-blue-700'}`}>
                                            {so.status || 'OPEN'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                        <span className="text-sm font-black text-slate-900 tabular-nums">
                                            ${so.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        {!isConverted && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConvertToInvoice(so.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 whitespace-nowrap"
                                            >
                                                Convert to Invoice
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm font-black uppercase tracking-widest">No matching sales orders</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SOTable;
