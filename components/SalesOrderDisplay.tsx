import React from 'react';
import { Transaction, Customer, Item, QBClass } from '../types';

interface SalesOrderDisplayProps {
    salesOrder: Transaction;
    customer: Customer | undefined;
    items: Item[];
    classes: QBClass[];
    onClose: () => void;
    onConvertToInvoice?: (salesOrder: Transaction) => void;
}

const SalesOrderDisplay: React.FC<SalesOrderDisplayProps> = ({ salesOrder, customer, items, classes, onClose, onConvertToInvoice }) => {
    const totalAmount = salesOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'Accepted':
            case 'Complete': return 'text-green-600 border-green-600/20';
            case 'Converted': return 'text-blue-600 border-blue-600/20';
            case 'Declined': return 'text-red-600 border-red-600/20';
            default: return 'text-amber-600 border-amber-600/20';
        }
    };

    return (
        <div className="h-full bg-slate-100 p-8 overflow-y-auto font-sans">
            <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden min-h-[1056px] flex flex-col border border-slate-300 relative">

                {/* Status Watermark */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-[12px] ${getStatusColor(salesOrder.status)} text-opacity-20 text-8xl font-black px-12 py-4 pointer-events-none uppercase tracking-tighter opacity-10 z-0`}>
                    {salesOrder.status || 'OPEN'}
                </div>

                {/* Header / Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center no-print z-10">
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
                        {(salesOrder.status === 'Open' || salesOrder.status === 'OPEN' || !salesOrder.status) && onConvertToInvoice && (
                            <button
                                onClick={() => onConvertToInvoice(salesOrder)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2 mr-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Convert to Invoice
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Sales Order
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-16 flex-1 flex flex-col z-10 relative">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2 uppercase">Sales Order</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] pl-8">Order Confirmation</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {customer?.name || 'Unknown Customer'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {salesOrder.BillAddr?.Line1 ? (
                                    <p>{salesOrder.BillAddr.Line1}</p>
                                ) : customer?.address ? (
                                    customer.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-12 bg-slate-50 border-y-2 border-slate-200 py-8 px-10 mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Date</p>
                            <p className="text-lg font-black text-slate-900 italic">{salesOrder.date}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                            <p className={`text-lg font-black italic ${salesOrder.status === 'Converted' ? 'text-blue-600' : 'text-amber-600'}`}>
                                {salesOrder.status || 'Open'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sales Order No.</p>
                            <p className="text-lg font-black text-slate-900 font-mono tracking-tighter">#{salesOrder.refNo}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                    <th className="text-left py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                    <th className="text-center py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Rate</th>
                                    <th className="text-right py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {salesOrder.items.map((item, idx) => {
                                    const productItem = items.find(i => i.id === item.itemId);
                                    return (
                                        <tr key={idx} className="group">
                                            <td className="py-6 pr-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-sm">
                                                        {productItem?.name || item.itemId || 'Item'}
                                                    </span>
                                                    {item.lotNumber && (
                                                        <span className="text-[10px] font-black text-purple-700 uppercase mt-1 tracking-tighter px-2 py-0.5 bg-purple-50 w-fit rounded border border-purple-200">
                                                            Lot: {item.lotNumber}
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
                                                    PKR{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-6 pl-4 text-right">
                                                <span className="text-sm font-black text-slate-900">
                                                    PKR{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto border-t-8 border-slate-900 pt-12">
                        <div className="flex justify-between items-center bg-slate-100 p-8 rounded shadow-inner">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Total Order Amount</p>
                                <p className="text-sm font-bold text-slate-500 italic">Thank you for your business.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-6xl font-black italic text-slate-900 tracking-tighter">
                                    PKR{totalAmount}
                                </span>
                            </div>
                        </div>
                        {salesOrder.memo && (
                            <div className="mt-8 border-l-4 border-slate-200 pl-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Internal Note</p>
                                <p className="text-sm text-slate-600 font-medium italic leading-relaxed">{salesOrder.memo}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center mt-auto z-10">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black italic">SO</div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Reference ID</p>
                            <p className="text-xs font-mono">{salesOrder.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDisplay;
