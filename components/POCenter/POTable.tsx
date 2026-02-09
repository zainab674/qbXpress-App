
import React from 'react';
import { Transaction, Vendor } from '../../types';

interface POTableProps {
    pos: Transaction[];
    vendors: Vendor[];
    searchTerm: string;
    onOpenPO: (id: string) => void;
    onConvertToBill: (id: string) => void;
}

const POTable: React.FC<POTableProps> = ({ pos, vendors, searchTerm, onOpenPO, onConvertToBill }) => {
    const filtered = pos.filter(po => {
        const vendor = vendors.find(v => v.id === po.entityId);
        const searchStr = `${vendor?.name} ${po.refNo} ${po.total}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vendor</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PO #</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expected</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(po => {
                            const vendor = vendors.find(v => v.id === po.entityId);
                            return (
                                <tr
                                    key={po.id}
                                    className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                                    onClick={() => onOpenPO(po.id)}
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic">{vendor?.name || 'Unknown Vendor'}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">V-ID: {po.entityId.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{po.refNo || '--'}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{po.date}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{po.expectedDate || '--'}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm
                                            ${po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                                                po.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' :
                                                    'bg-blue-100 text-blue-700'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                        <span className="text-sm font-black text-slate-900 tabular-nums">
                                            ${po.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        {po.status === 'OPEN' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConvertToBill(po.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap"
                                            >
                                                Convert to Bill
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-sm font-black uppercase tracking-widest">No matching purchase orders</p>
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

export default POTable;
