import React, { useState } from 'react';
import { Customer, Transaction, Account } from '../../types';

interface CustomerDetailViewProps {
    customerId: string;
    customers: Customer[];
    transactions: Transaction[];
    accounts: Account[];
    onOpenTransaction?: (id: string, type: string) => void;
    onClose?: () => void;
}

const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
    customerId,
    customers,
    transactions,
    accounts,
    onOpenTransaction
}) => {
    const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'CREDITS' | 'ESTIMATES' | 'DETAILS' | 'NOTES'>('TRANSACTIONS');
    const [newNoteText, setNewNoteText] = useState('');

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return <div className="p-8 text-gray-500">Customer not found.</div>;

    const customerTransactions = transactions
        .filter(t => t.entityId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const openInvoices = customerTransactions.filter(t => t.type === 'INVOICE' && t.status === 'OPEN');
    const overdueInvoices = customerTransactions.filter(t => t.type === 'INVOICE' && t.status === 'OVERDUE');
    const totalOpenBalance = openInvoices.reduce((sum, t) => sum + t.total, 0) + overdueInvoices.reduce((sum, t) => sum + t.total, 0);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto font-sans custom-scrollbar">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="flex gap-5 items-start">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{customer.companyName || customer.name}</h1>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">📧 {customer.email || 'No email'}</span>
                                <span className="flex items-center gap-1">📞 {customer.phone || 'No phone'}</span>
                                <span className="flex items-center gap-1">📍 {customer.address || 'No address'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Open Balance</p>
                        <p className={`text-4xl font-black ${totalOpenBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${totalOpenBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Open Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{openInvoices.length + overdueInvoices.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{customerTransactions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Customer Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${customer.balance.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Last Activity</p>
                    <p className="text-2xl font-bold text-gray-900">{customerTransactions[0]?.date || 'N/A'}</p>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="px-8 pb-8 flex flex-col">
                <div className="flex gap-6 border-b border-gray-200 mb-6 bg-slate-50 sticky top-[120px] z-10 pt-4">
                    <button
                        onClick={() => setActiveTab('TRANSACTIONS')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'TRANSACTIONS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Transactions
                        {activeTab === 'TRANSACTIONS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('CREDITS')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'CREDITS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Credits
                        {activeTab === 'CREDITS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('ESTIMATES')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'ESTIMATES' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Estimates
                        {activeTab === 'ESTIMATES' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('DETAILS')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'DETAILS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Customer Details
                        {activeTab === 'DETAILS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('NOTES')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'NOTES' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Notes
                        {activeTab === 'NOTES' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    {['TRANSACTIONS', 'CREDITS', 'ESTIMATES'].includes(activeTab) ? (
                        <div className="w-full">
                            {activeTab !== 'TRANSACTIONS' && (
                                <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        {activeTab === 'CREDITS' ? 'Credit Memos' : 'Estimates'}
                                    </h4>
                                    <button
                                        onClick={() => onOpenTransaction?.('NEW', activeTab === 'CREDITS' ? 'CREDIT_MEMO' : 'ESTIMATE')}
                                        className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors uppercase tracking-tighter shadow-sm active:scale-95"
                                    >
                                        + New {activeTab === 'CREDITS' ? 'Credit Memo' : 'Estimate'}
                                    </button>
                                </div>
                            )}
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Number</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {customerTransactions
                                        .filter(tx => {
                                            if (activeTab === 'CREDITS') return tx.type === 'CREDIT_MEMO';
                                            if (activeTab === 'ESTIMATES') return tx.type === 'ESTIMATE';
                                            return true;
                                        })
                                        .map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${tx.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' :
                                                            tx.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                                                                tx.type === 'ESTIMATE' ? 'bg-amber-100 text-amber-700' :
                                                                    tx.type === 'CREDIT_MEMO' ? 'bg-pink-100 text-pink-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {tx.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                    ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => onOpenTransaction?.(tx.id, tx.type)}
                                                        className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all underline decoration-double underline-offset-4"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {customerTransactions.filter(tx => {
                                        if (activeTab === 'CREDITS') return tx.type === 'CREDIT_MEMO';
                                        if (activeTab === 'ESTIMATES') return tx.type === 'ESTIMATE';
                                        return true;
                                    }).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No {activeTab.toLowerCase()} found for this customer.</td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'DETAILS' ? (
                        <div className="p-8 grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="col-span-2">
                                            <p className="text-gray-400">Company Name</p>
                                            <p className="font-bold text-gray-900">{customer.companyName || '—'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-400">Email Address</p>
                                            <p className="font-bold text-gray-900">{customer.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Phone</p>
                                            <p className="font-bold text-gray-900">{customer.phone || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Address</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 font-medium text-gray-700 whitespace-pre-wrap min-h-[80px]">
                                        {customer.address || 'No address'}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Customer Stats</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-800/70">Total Sales</span>
                                            <span className="font-bold text-blue-900">${customerTransactions.reduce((sum, t) => sum + (['INVOICE', 'SALES_RECEIPT'].includes(t.type) ? t.total : 0), 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-800/70">Loyalty Status</span>
                                            <span className="font-bold text-blue-900">{customerTransactions.length > 5 ? 'VIP' : 'Standard'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8">
                            <textarea
                                className="w-full border p-4 rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 ring-blue-100 border-gray-200 transition-all"
                                placeholder="Add a new customer note..."
                                value={newNoteText}
                                onChange={e => setNewNoteText(e.target.value)}
                            />
                            <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                                Save Note
                            </button>
                            <div className="space-y-4 mt-8">
                                {customer.notes?.map(n => (
                                    <div key={n.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                                        <p className="text-sm text-gray-800 italic">"{n.text}"</p>
                                        <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            <span>By {n.author}</span>
                                            <span>{n.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDetailView;
