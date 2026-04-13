
import React from 'react';
import { Transaction, Vendor } from '../../types';

interface POTableProps {
    pos: Transaction[];
    vendors: Vendor[];
    searchTerm: string;
    onOpenPO: (id: string) => void;
    onConvertToBill: (id: string) => void;
    onMarkBackorder: (id: string, status: 'FULL' | 'PARTIAL' | 'NONE') => void;
    onEditPO: (id: string) => void;
    onDeletePO: (id: string) => void;
}

const POTable: React.FC<POTableProps> = ({ pos, vendors, searchTerm, onOpenPO, onConvertToBill, onMarkBackorder, onEditPO, onDeletePO }) => {
    const [backorderMenuId, setBackorderMenuId] = React.useState<string | null>(null);
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
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
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
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm w-fit
                                                ${po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                                                    po.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' :
                                                    po.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-blue-100 text-blue-700'}`}>
                                                {po.status === 'PARTIALLY_RECEIVED' ? 'Partial Rcvd' : po.status}
                                            </span>
                                            {po.backorderStatus === 'FULL' && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200 w-fit">
                                                    Backordered
                                                </span>
                                            )}
                                            {po.backorderStatus === 'PARTIAL' && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 w-fit">
                                                    Partial B/O
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm font-black text-slate-900 tabular-nums">
                                                ${po.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            {(po.status === 'OPEN' || po.status === 'PARTIALLY_RECEIVED') && (
                                                <>
                                                    <div className="relative opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBackorderMenuId(backorderMenuId === po.id ? null : po.id);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 whitespace-nowrap border
                                                                ${po.backorderStatus === 'FULL' ? 'bg-red-100 text-red-700 border-red-300' :
                                                                  po.backorderStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                                                  'bg-slate-100 text-slate-600 border-slate-300'}`}
                                                        >
                                                            {po.backorderStatus === 'FULL' ? 'Fully B/O' :
                                                             po.backorderStatus === 'PARTIAL' ? 'Partial B/O' : 'Backorder ▾'}
                                                        </button>
                                                        {backorderMenuId === po.id && (
                                                            <div
                                                                className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden min-w-[150px]"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {(['NONE', 'PARTIAL', 'FULL'] as const).map(status => (
                                                                    <button
                                                                        key={status}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onMarkBackorder(po.id, status);
                                                                            setBackorderMenuId(null);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors
                                                                            ${po.backorderStatus === status ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}
                                                                    >
                                                                        {status === 'NONE' ? 'None' : status === 'PARTIAL' ? 'Partial B/O' : 'Fully Backordered'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onConvertToBill(po.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap"
                                                    >
                                                        {po.status === 'PARTIALLY_RECEIVED' ? 'Bill Remaining' : 'Convert to Bill'}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditPO(po.id); }}
                                                className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-amber-200 transition-all active:scale-95 text-amber-600"
                                                title="Edit PO"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('Delete this purchase order? This cannot be undone.')) {
                                                        onDeletePO(po.id);
                                                    }
                                                }}
                                                className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-red-200 transition-all active:scale-95 text-red-500"
                                                title="Delete PO"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-8 py-20 text-center">
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
