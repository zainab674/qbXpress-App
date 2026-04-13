import React, { useState } from 'react';
import { Transaction, Customer } from '../../types';

interface Props {
    invoices: Transaction[];
    customers: Customer[];
    onOpenInvoice: (invoice: Transaction) => void;
    onReceivePayment: (invoice: Transaction) => void;
    onEditInvoice: (invoice: Transaction) => void;
    onDeleteInvoice: (id: string) => void;
}

const InvoiceTable: React.FC<Props> = ({
    invoices,
    customers,
    onOpenInvoice,
    onReceivePayment,
    onEditInvoice,
    onDeleteInvoice
}) => {
    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] first:pl-12">Customer</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice ID</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Due Date</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-12">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {invoices.map(invoice => (
                            <tr
                                key={invoice.id}
                                onClick={() => onOpenInvoice(invoice)}
                                className="group cursor-pointer hover:bg-blue-50/30 transition-all duration-300"
                            >
                                <td className="p-6 first:pl-12">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                            {getCustomerName(invoice.entityId || '').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                {getCustomerName(invoice.entityId || '')}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">TERMS: {invoice.terms || 'Net 30'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors tracking-widest leading-none">
                                        #{invoice.refNo}
                                    </span>
                                </td>
                                <td className="p-6 text-sm font-semibold text-slate-600 italic">
                                    {invoice.dueDate || invoice.date}
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex flex-col items-end">
                                        <div className="text-lg font-black text-slate-900 tracking-tighter shadow-sm group-hover:text-blue-600 transition-colors">
                                            ${invoice.total.toLocaleString()}
                                        </div>
                                        <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${invoice.status === 'PAID' ? 'text-emerald-500' : 'text-rose-500 animate-pulse'
                                            }`}>
                                            {invoice.status || 'UNPAID'}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-right pr-12" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditInvoice(invoice); }}
                                            className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-amber-200 transition-all active:scale-95 text-amber-600"
                                            title="Edit Invoice"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Delete this invoice? This cannot be undone.')) {
                                                    onDeleteInvoice(invoice.id);
                                                }
                                            }}
                                            className="p-2 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-red-200 transition-all active:scale-95 text-red-500"
                                            title="Delete Invoice"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        {invoice.status !== 'PAID' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReceivePayment(invoice);
                                                }}
                                                className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                                            >
                                                Receive Payment
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl mb-4">🔍</span>
                                        <p className="text-slate-400 font-bold italic uppercase tracking-widest text-sm">No invoices found matching criteria</p>
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

export default InvoiceTable;
