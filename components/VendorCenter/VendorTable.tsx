import React, { useState } from 'react';
import { Vendor, Transaction } from '../../types';

interface VendorTableProps {
    vendors: Vendor[];
    transactions: Transaction[];
    onSelectVendor: (id: string) => void;
    selectedVendorId: string;
    onOpenDetail: (vendor: Vendor) => void;
}

const VendorTable: React.FC<VendorTableProps> = ({ vendors, transactions, onSelectVendor, selectedVendorId, onOpenDetail }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const getVendorTransactions = (vendorId: string) => {
        return transactions.filter(t => t.entityId === vendorId);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total Spend</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Transactions</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Last Activity</th>
                        <th className="px-6 py-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {vendors.map(vendor => {
                        const isExpanded = expandedId === vendor.id;
                        const vendorTransactions = getVendorTransactions(vendor.id);
                        const lastTransaction = vendorTransactions[vendorTransactions.length - 1];

                        return (
                            <React.Fragment key={vendor.id}>
                                <tr
                                    onClick={() => onSelectVendor(vendor.id)}
                                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedVendorId === vendor.id ? 'bg-blue-50/30' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {vendor.name.charAt(0)}
                                            </div>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenDetail(vendor);
                                                }}
                                                className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                            >
                                                {vendor.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        ${vendor.balance.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {vendorTransactions.length}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {lastTransaction?.date || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedId(isExpanded ? null : vendor.id);
                                            }}
                                            className="text-gray-400 hover:text-gray-600 p-1"
                                        >
                                            <span className={`transform transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>
                                                ▼
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase text-right">Amount</th>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase text-center">Status</th>
                                                            <th className="px-4 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {vendorTransactions.map(t => (
                                                            <tr key={t.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2 text-gray-900">{t.date}</td>
                                                                <td className="px-4 py-2 text-right font-semibold text-gray-900">${t.total.toLocaleString()}</td>
                                                                <td className="px-4 py-2 text-center">
                                                                    <span className="inline-block px-2 py-1 text-[10px] font-bold rounded bg-green-100 text-green-700 uppercase">
                                                                        {t.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button className="text-blue-600 hover:text-blue-800 text-xs">View detail</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {vendorTransactions.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                                                    No recent transactions found.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default VendorTable;
