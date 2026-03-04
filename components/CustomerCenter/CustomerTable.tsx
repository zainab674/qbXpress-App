import React, { useState } from 'react';
import { Customer, Transaction } from '../../types';

interface CustomerTableProps {
    customers: Customer[];
    transactions: Transaction[];
    onSelectCustomer: (id: string) => void;
    selectedCustomerId: string;
    onOpenDetail: (customer: Customer) => void;
    onOpenTransaction?: (id: string, type: string) => void;
    onDeleteCustomer: (id: string) => void;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
    customers,
    transactions,
    onSelectCustomer,
    selectedCustomerId,
    onOpenDetail,
    onOpenTransaction,
    onDeleteCustomer,
    selectedIds,
    onSelectionChange
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleSelectAll = () => {
        if (selectedIds.length === customers.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(customers.map(c => c.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    const getCustomerTransactions = (customerId: string) => {
        return transactions.filter(t => t.entityId === customerId);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 w-12">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={customers.length > 0 && selectedIds.length === customers.length}
                                onChange={toggleSelectAll}
                            />
                        </th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Balance</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Transactions</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Last Activity</th>
                        <th className="px-6 py-4 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {customers.map(customer => {
                        const isExpanded = expandedId === customer.id;
                        const isSelected = selectedIds.includes(customer.id);
                        const customerTransactions = getCustomerTransactions(customer.id);
                        const lastTransaction = customerTransactions[customerTransactions.length - 1];

                        return (
                            <React.Fragment key={customer.id}>
                                <tr
                                    onClick={() => onSelectCustomer(customer.id)}
                                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedCustomerId === customer.id ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-blue-50/60' : ''}`}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(customer.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {customer.name.charAt(0)}
                                            </div>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenDetail(customer);
                                                }}
                                                className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                            >
                                                {customer.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        ${customer.balance.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {customerTransactions.length}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {lastTransaction?.date || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteCustomer(customer.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                title="Delete Customer"
                                            >
                                                🗑️
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedId(isExpanded ? null : customer.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                            >
                                                <span className={`transform transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>
                                                    ▼
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase">Type</th>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase text-right">Amount</th>
                                                            <th className="px-4 py-2 text-xs text-gray-500 uppercase text-center">Status</th>
                                                            <th className="px-4 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {customerTransactions.map(t => (
                                                            <tr key={t.id} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2 text-gray-900">{t.type}</td>
                                                                <td className="px-4 py-2 text-gray-500">{t.date}</td>
                                                                <td className="px-4 py-2 text-right font-semibold text-gray-900">${t.total.toLocaleString()}</td>
                                                                <td className="px-4 py-2 text-center">
                                                                    <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded uppercase ${t.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                                        t.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {t.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => onOpenTransaction?.(t.id, t.type)}
                                                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-widest"
                                                                    >
                                                                        View detail
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {customerTransactions.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
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

export default CustomerTable;
