import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Customer, Transaction } from '../../types';

interface CustomerTableProps {
    customers: Customer[];
    transactions: Transaction[];
    onSelectCustomer: (id: string) => void;
    selectedCustomerId: string;
    onOpenDetail: (customer: Customer) => void;
    onOpenTransaction?: (id: string, type: string) => void;
    onDeleteCustomer: (id: string) => void;
    onEditCustomer?: (customer: Customer) => void;
    onToggleInactive?: (id: string, isActive: boolean) => void;
    onSendStatement?: (id: string) => void;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

interface MenuState {
    customerId: string;
    x: number;
    y: number;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
    customers,
    transactions,
    onSelectCustomer,
    selectedCustomerId,
    onOpenDetail,
    onOpenTransaction,
    onDeleteCustomer,
    onEditCustomer,
    onToggleInactive,
    onSendStatement,
    selectedIds,
    onSelectionChange
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [menuState, setMenuState] = useState<MenuState | null>(null);

    const toggleSelectAll = () => {
        onSelectionChange(selectedIds.length === customers.length ? [] : customers.map(c => c.id));
    };

    const toggleSelect = (id: string) => {
        onSelectionChange(selectedIds.includes(id) ? selectedIds.filter(sid => sid !== id) : [...selectedIds, id]);
    };

    const getCustomerTransactions = (customerId: string) => {
        return transactions.filter(t => t.entityId === customerId);
    };

    const openMenu = (e: React.MouseEvent, customerId: string) => {
        e.stopPropagation();
        if (menuState?.customerId === customerId) {
            setMenuState(null);
            return;
        }
        const btn = e.currentTarget as HTMLElement;
        const rect = btn.getBoundingClientRect();
        setMenuState({ customerId, x: rect.right, y: rect.bottom });
    };

    // Close on outside click or scroll
    useEffect(() => {
        if (!menuState) return;
        const close = () => setMenuState(null);
        document.addEventListener('mousedown', close);
        document.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('scroll', close, true);
        };
    }, [menuState]);

    const activeCustomer = menuState ? customers.find(c => c.id === menuState.customerId) : null;
    const isActiveInactive = activeCustomer?.isActive === false;

    const dropdownMenu = menuState && activeCustomer && ReactDOM.createPortal(
        <div
            onMouseDown={e => e.stopPropagation()}
            style={{ position: 'fixed', top: menuState.y + 4, right: window.innerWidth - menuState.x, zIndex: 9999 }}
            className="w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 text-sm"
        >
            <button
                onClick={() => { onEditCustomer?.(activeCustomer); setMenuState(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium"
            >
                Edit Customer
            </button>
            <button
                onClick={() => { onOpenDetail(activeCustomer); setMenuState(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
            >
                View Detail
            </button>
            <button
                onClick={() => { onSendStatement?.(activeCustomer.id); setMenuState(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
            >
                Send Statement
            </button>
            <button
                onClick={() => { onToggleInactive?.(activeCustomer.id, !activeCustomer.isActive); setMenuState(null); }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
            >
                Make {isActiveInactive ? 'Active' : 'Inactive'}
            </button>
            <hr className="my-1 border-gray-100" />
            <button
                onClick={() => { onDeleteCustomer(activeCustomer.id); setMenuState(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
            >
                Delete
            </button>
        </div>,
        document.body
    );

    return (
        <>
            {dropdownMenu}
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
                            <th className="px-6 py-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {customers.map(customer => {
                            const isExpanded = expandedId === customer.id;
                            const isSelected = selectedIds.includes(customer.id);
                            const customerTransactions = getCustomerTransactions(customer.id);
                            const lastTransaction = [...customerTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            const isInactive = customer.isActive === false;

                            return (
                                <React.Fragment key={customer.id}>
                                    <tr
                                        onClick={() => onSelectCustomer(customer.id)}
                                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedCustomerId === customer.id ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-blue-50/60' : ''} ${isInactive ? 'opacity-60' : ''}`}
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
                                                <div>
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); onOpenDetail(customer); }}
                                                        className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {customer.name}
                                                    </span>
                                                    {isInactive && (
                                                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded-full">INACTIVE</span>
                                                    )}
                                                    {customer.companyName && customer.companyName !== customer.name && (
                                                        <p className="text-xs text-gray-400">{customer.companyName}</p>
                                                    )}
                                                </div>
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
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1 justify-end">
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                                                    className="text-gray-400 hover:text-gray-600 p-1 text-xs"
                                                    title="View transactions"
                                                >
                                                    <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                                </button>
                                                <button
                                                    onClick={(e) => openMenu(e, customer.id)}
                                                    className="text-gray-400 hover:text-gray-600 p-1 text-xs font-bold"
                                                    title="More"
                                                >
                                                    ⋮
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
                                                                        <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded uppercase ${
                                                                            t.status === 'PAID'    ? 'bg-green-100 text-green-700' :
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
        </>
    );
};

export default CustomerTable;
