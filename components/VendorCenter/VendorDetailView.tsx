
import React, { useState } from 'react';
import { Vendor, Transaction, Account } from '../../types';

interface VendorDetailViewProps {
    vendorId: string;
    vendors: Vendor[];
    transactions: Transaction[];
    accounts: Account[];
    onOpenTransaction?: (id: string, type: string) => void;
    onClose?: () => void;
}

const VendorDetailView: React.FC<VendorDetailViewProps> = ({
    vendorId,
    vendors,
    transactions,
    accounts,
    onOpenTransaction
}) => {
    const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'DETAILS' | 'CREDITS'>('TRANSACTIONS');

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return <div className="p-8 text-gray-500">Vendor not found.</div>;

    const vendorTransactions = transactions
        .filter(t => t.entityId === vendorId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const openBills = vendorTransactions.filter(t => t.type === 'BILL' && t.status === 'OPEN');
    const vendorCredits = vendorTransactions.filter(t => t.type === 'VENDOR_CREDIT');
    const totalOpenBalance = openBills.reduce((sum, t) => sum + t.total, 0);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto font-sans custom-scrollbar">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="flex gap-5 items-start">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {vendor.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{vendor.companyName || vendor.name}</h1>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">📧 {vendor.email || 'No email'}</span>
                                <span className="flex items-center gap-1">📞 {vendor.phone || 'No phone'}</span>
                                <span className="flex items-center gap-1">📍 {vendor.address || 'No address'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Balance Owed</p>
                        <p className={`text-4xl font-black ${totalOpenBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${totalOpenBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>

                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Open Bills</p>
                    <p className="text-2xl font-bold text-gray-900">{openBills.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{vendorTransactions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${vendor.balance.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Last Activity</p>
                    <p className="text-2xl font-bold text-gray-900">{vendorTransactions[0]?.date || 'N/A'}</p>
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
                        onClick={() => setActiveTab('DETAILS')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'DETAILS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Vendor Details
                        {activeTab === 'DETAILS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    {activeTab === 'TRANSACTIONS' ? (
                        <div className="w-full">
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
                                    {vendorTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${tx.type === 'BILL' ? 'bg-orange-100 text-orange-700' : tx.type === 'PURCHASE_ORDER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {tx.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${tx.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                                    {vendorTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No transactions found for this vendor.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : activeTab === 'CREDITS' ? (
                        <div className="w-full flex flex-col">
                            <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Vendor Credits</h4>
                                <button
                                    onClick={() => onOpenTransaction?.('NEW_CREDIT', 'VENDOR_CREDIT')}
                                    className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors uppercase tracking-tighter shadow-sm active:scale-95"
                                >
                                    + New Credit
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Number</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {vendorCredits.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${tx.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => onOpenTransaction?.(tx.id, tx.type)}
                                                    className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all underline decoration-double underline-offset-4"
                                                >
                                                    View Record
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vendorCredits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No credits found for this vendor.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">First Name</p>
                                            <p className="font-bold text-gray-900">{vendor.GivenName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Last Name</p>
                                            <p className="font-bold text-gray-900">{vendor.FamilyName || '—'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-400">Email Address</p>
                                            <p className="font-bold text-gray-900">{vendor.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Phone</p>
                                            <p className="font-bold text-gray-900">{vendor.phone || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Website</p>
                                            <p className="font-bold text-gray-900">{vendor.WebAddr?.URI || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Addresses</h4>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div>
                                            <p className="text-gray-400 mb-1">Billing Address</p>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 font-medium text-gray-700 whitespace-pre-wrap min-h-[80px]">
                                                {vendor.address || 'No billing address'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-1">Shipping Address</p>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 font-medium text-gray-700 whitespace-pre-wrap min-h-[80px]">
                                                {vendor.ShipAddr?.Line1 ? `${vendor.ShipAddr.Line1}\n${vendor.ShipAddr.City}, ${vendor.ShipAddr.CountrySubDivisionCode} ${vendor.ShipAddr.PostalCode}` : 'Same as billing'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Financial Settings</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Terms</p>
                                            <p className="font-bold text-gray-900">{vendor.TermsRef?.name || 'Due on Receipt'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Vendor ID/Account</p>
                                            <p className="font-bold text-gray-900">{vendor.vendorAccountNo || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Tax ID</p>
                                            <p className="font-bold text-gray-900">{vendor.TaxIdentifier || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">1099 Eligible</p>
                                            <p className="font-bold text-gray-900">{vendor.Vendor1099 ? 'Yes' : 'No'}</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorDetailView;
