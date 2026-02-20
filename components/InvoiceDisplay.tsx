import React from 'react';
import { Transaction, Customer, Item, QBClass } from '../types';

interface InvoiceDisplayProps {
    invoice: Transaction;
    customer: Customer | undefined;
    items: Item[];
    classes: QBClass[];
    onClose: () => void;
}

const InvoiceDisplay: React.FC<InvoiceDisplayProps> = ({ invoice, customer, items, classes, onClose }) => {
    const totalAmount = invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 });

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
                            Print Invoice
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-16 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <h1 className="text-6xl font-serif italic text-slate-900 border-l-8 border-blue-900 pl-6 mb-2">INVOICE</h1>
                            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs pl-8">Sales Transaction</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4 italic">
                                {customer?.name || 'Unknown Customer'}
                            </h2>
                            <div className="text-sm text-slate-500 leading-relaxed font-medium">
                                {customer?.address ? (
                                    customer.address.split('\n').map((line, i) => <p key={i}>{line}</p>)
                                ) : (
                                    <p>No address on file</p>
                                )}
                                {customer?.phone && <p>Tel: {customer.phone}</p>}
                                {(invoice.email || customer?.email) && <p className="font-bold text-slate-700">Email: {invoice.email || customer?.email}</p>}
                                {invoice.cc && <p className="text-xs bg-slate-50 px-2 py-1 rounded mt-1 border border-slate-200">Cc: {invoice.cc}</p>}
                                {invoice.bcc && <p className="text-xs bg-slate-50 px-2 py-1 rounded mt-1 border border-slate-200">Bcc: {invoice.bcc}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-6 bg-slate-50 border-y-2 border-slate-300 py-10 px-10 mb-12 shadow-sm">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Invoice Date</p>
                            <p className="text-xl font-black text-slate-900 italic">{invoice.date}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Due Date</p>
                            <p className={`text-xl font-black italic ${invoice.status === 'PAID' ? 'text-green-600' : 'text-red-700 underline'}`}>
                                {invoice.dueDate || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Terms</p>
                            <p className="text-xl font-black text-slate-900 italic">{invoice.terms || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Invoice No.</p>
                            <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">#{invoice.refNo}</p>
                        </div>
                        <div className="text-right border-l border-slate-200 pl-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Ship Via</p>
                            <p className="text-xl font-black text-blue-900 italic">{invoice.shipVia || 'Standard'}</p>
                        </div>
                    </div>

                    <div className="flex-1">
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="text-left py-4 text-xs font-black uppercase tracking-widest text-slate-500">Item / Service</th>
                                    <th className="text-left py-4 text-xs font-black uppercase tracking-widest text-slate-500">Description</th>
                                    <th className="text-center py-4 text-xs font-black uppercase tracking-widest text-slate-500">Qty</th>
                                    <th className="text-right py-4 text-xs font-black uppercase tracking-widest text-slate-500">Rate</th>
                                    <th className="text-right py-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100">
                                {invoice.items.map((item, idx) => {
                                    const serviceItem = items.find(i => i.id === item.itemId);
                                    return (
                                        <tr key={idx} className="group border-b border-slate-100">
                                            <td className="py-8 pr-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-base">
                                                        {serviceItem?.name || item.itemId || 'Service/Item'}
                                                    </span>
                                                    {item.lotNumber && (
                                                        <span className="text-[10px] font-black text-purple-700 uppercase mt-2 tracking-tighter px-2 py-1 bg-purple-50 w-fit rounded border border-purple-200 shadow-sm flex items-center gap-1">
                                                            <span className="text-xs">🏷️</span> Lot: {item.lotNumber}
                                                        </span>
                                                    )}
                                                    {item.classId && (
                                                        <span className="text-[10px] font-bold text-blue-700 uppercase mt-2 tracking-tighter px-2 py-1 bg-blue-100 w-fit rounded border border-blue-200">
                                                            Class: {classes.find(c => c.id === item.classId)?.name || item.classId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-8 px-4">
                                                <p className="text-base text-slate-700 font-bold italic">
                                                    {item.description || '-'}
                                                </p>
                                            </td>
                                            <td className="py-8 px-4 text-center">
                                                <span className="text-base font-black text-slate-900">{item.quantity}</span>
                                            </td>
                                            <td className="py-8 px-4 text-right">
                                                <span className="text-base font-bold text-slate-600">
                                                    ${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-8 pl-4 text-right">
                                                <span className="text-base font-black text-slate-900 bg-slate-50 px-2 py-1 rounded">
                                                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto border-t-[12px] border-slate-900 pt-16">
                        {/* Shipping & Logistics Info Section */}
                        <div className="grid grid-cols-2 gap-10 mb-12">
                            <div className="bg-blue-50/50 p-6 rounded-lg border-2 border-blue-100 shadow-inner">
                                <h3 className="text-sm font-black text-blue-900 uppercase tracking-[0.2em] mb-4 border-b border-blue-200 pb-2">Shipping Details</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Tracking Number</span>
                                        <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded shadow-sm border border-slate-200">{invoice.trackingNo || 'Not Assigned'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Ship Date</span>
                                        <span className="text-sm font-black text-slate-900">{invoice.shipDate || 'Pending'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">FOB</span>
                                        <span className="text-sm font-black text-slate-900">{invoice.fob || 'Origin'}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-blue-200 pt-3 mt-2">
                                        <span className="text-xs font-black text-blue-800 uppercase">Shipment Cost</span>
                                        <span className="text-base font-black text-blue-900">${(invoice.shippingDetails?.shipmentCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-lg border-2 border-slate-200">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-4 border-b border-slate-300 pb-2">Packaging Hierarchy</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Inner Pack', dim: invoice.shippingDetails?.innerPackDimensions },
                                        { label: 'Outer Box', dim: invoice.shippingDetails?.outerBoxDimensions },
                                        { label: 'Master Carton', dim: invoice.shippingDetails?.masterCartonDimensions }
                                    ].map((box, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 shadow-sm">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{box.label}</span>
                                            <span className="text-sm font-black text-slate-900 italic">
                                                {box.dim ? `${box.dim.length} x ${box.dim.width} x ${box.dim.height} ${box.dim.unit}` : 'N/A'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-10 rounded-lg border-2 border-slate-200 shadow-sm relative overflow-hidden mb-12">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Subtotal</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-slate-700">
                                        ${(invoice.subtotal || invoice.total - (invoice.taxAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                            {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
                                <div className="flex justify-between items-center mb-6 pb-6 border-b-2 border-slate-200">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Sales Tax</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-red-700">
                                            ${invoice.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center bg-white -mx-10 p-10 relative overflow-hidden border-y-4 border-slate-900">
                                {invoice.status === 'PAID' && (
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-[12px] border-green-600/10 text-green-600/10 text-9xl font-black px-16 py-8 pointer-events-none uppercase tracking-widest">
                                        PAID
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Total Invoice Amount</p>
                                    <p className="text-base font-black text-blue-900 italic">Your satisfaction is our priority.</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-7xl font-black italic text-slate-900 tracking-tighter drop-shadow-sm">
                                        ${totalAmount}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mt-10">
                                {invoice.deposit !== undefined && invoice.deposit > 0 && (
                                    <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-inner">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Deposit Received</p>
                                        <p className="text-2xl font-black text-green-700 font-mono">
                                            -${invoice.deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-blue-900 p-6 rounded-lg border-2 border-blue-950 shadow-lg col-start-2">
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-300 mb-2">Balance Remaining</p>
                                    <p className="text-3xl font-black text-white font-mono drop-shadow-md">
                                        ${((customer?.balance || 0) + invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-16 mt-16 pb-16">
                            <div className="space-y-10">
                                {invoice.paymentOptions && invoice.paymentOptions.length > 0 && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 underline decoration-blue-500 decoration-4 underline-offset-8">Payment Options</p>
                                        <p className="text-base text-slate-800 font-black italic bg-slate-100 px-4 py-3 rounded border-l-8 border-blue-900 shadow-sm">{invoice.paymentOptions.join(', ')}</p>
                                    </div>
                                )}
                                {invoice.vendorMessage && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Note to Customer</p>
                                        <p className="text-base text-slate-700 font-bold italic leading-relaxed bg-yellow-50 p-6 border-2 border-yellow-200 rounded-lg shadow-sm">"{invoice.vendorMessage}"</p>
                                    </div>
                                )}
                                {invoice.memoOnStatement && (
                                    <div className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Statement Memo (Internal Only)</p>
                                        <div className="border border-dashed border-slate-300 p-4 rounded text-sm text-slate-500 font-medium italic">
                                            {invoice.memoOnStatement}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-8">
                                {invoice.attachments && invoice.attachments.length > 0 && (
                                    <div className="bg-slate-50 p-8 rounded-xl border-2 border-slate-200 shadow-inner">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Verified Attachments</p>
                                        <div className="flex flex-col gap-4">
                                            {invoice.attachments.map((a, i) => (
                                                <div key={i} className="text-sm text-blue-800 font-black flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer">
                                                    <span className="text-xl">📄</span>
                                                    <span className="flex-1 truncate">{a.name}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase">View</span>
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
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Invoice ID</p>
                            <p className="text-xs font-mono">{invoice.id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDisplay;
