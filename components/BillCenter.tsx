import React, { useState, useMemo } from 'react';
import { Transaction, Vendor, ViewState } from '../types';
import SummaryCard from './BillCenter/SummaryCard';
import BillTable from './BillCenter/BillTable';

interface BillCenterProps {
    transactions: Transaction[];
    vendors: Vendor[];
    onOpenWindow: (type: ViewState, title: string, params?: any) => void;
    onPayBill: (billId: string) => void;
    onDeleteTransaction: (id: string) => void;
}

const BillCenter: React.FC<BillCenterProps> = ({ transactions, vendors, onOpenWindow, onPayBill, onDeleteTransaction }) => {
    const [activeCategory, setActiveCategory] = useState<'All' | 'Unpaid' | 'Paid' | 'Overdue' | 'Receipts'>('All');
    const [searchTerm, setSearchTerm] = useState('');

    const allBills = useMemo(() =>
        transactions.filter(t => t.type?.toUpperCase() === 'BILL'),
        [transactions]);

    const unpaidBills = useMemo(() =>
        allBills.filter(b => b.status?.toUpperCase() !== 'PAID'),
        [allBills]);

    const paidBills = useMemo(() =>
        allBills.filter(b => b.status?.toUpperCase() === 'PAID'),
        [allBills]);

    const overdueBills = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return unpaidBills.filter(b => {
            if (b.dueDate) {
                const due = new Date(b.dueDate);
                due.setHours(0, 0, 0, 0);
                return due < today;
            }
            // Fallback: assume Net 30 if no dueDate
            const billDate = new Date(b.date);
            if (isNaN(billDate.getTime())) return false;
            billDate.setDate(billDate.getDate() + 30);
            billDate.setHours(0, 0, 0, 0);
            return billDate < today;
        });
    }, [unpaidBills]);

    const itemReceipts = useMemo(() =>
        transactions.filter(t => t.type?.toUpperCase() === 'RECEIVE_ITEM'),
        [transactions]);

    const filteredBills = useMemo(() => {
        switch (activeCategory) {
            case 'Unpaid': return unpaidBills;
            case 'Paid': return paidBills;
            case 'Overdue': return overdueBills;
            case 'Receipts': return itemReceipts;
            default: return allBills;
        }
    }, [activeCategory, allBills, unpaidBills, paidBills, overdueBills, itemReceipts]);

    const metrics = [
        {
            id: 'All',
            title: 'All Bills',
            value: `$${allBills.reduce((acc, b) => acc + b.total, 0).toLocaleString()}`,
            count: allBills.length,
            data: [30, 45, 35, 50, 40, 60, 55],
            color: '#6366f1'
        },
        {
            id: 'Unpaid',
            title: 'Unpaid Bills',
            value: `$${unpaidBills.reduce((acc, b) => acc + b.total, 0).toLocaleString()}`,
            count: unpaidBills.length,
            data: [20, 30, 25, 35, 30, 40, 38],
            color: '#f59e0b'
        },
        {
            id: 'Paid',
            title: 'Paid Bills',
            value: `$${paidBills.reduce((acc, b) => acc + b.total, 0).toLocaleString()}`,
            count: paidBills.length,
            data: [15, 25, 20, 30, 25, 35, 32],
            color: '#10b981'
        },
        {
            id: 'Overdue',
            title: 'Overdue Bills',
            value: `$${overdueBills.reduce((acc, b) => acc + b.total, 0).toLocaleString()}`,
            count: overdueBills.length,
            data: [10, 15, 12, 18, 15, 20, 19],
            color: '#ef4444'
        },
        {
            id: 'Receipts',
            title: 'Item Receipts',
            value: `$${itemReceipts.reduce((acc, b) => acc + b.total, 0).toLocaleString()}`,
            count: itemReceipts.length,
            data: [5, 10, 8, 12, 11, 15, 14],
            color: '#14b8a6'
        }
    ];

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar Metrics */}
            <div className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-1 mb-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Bill Center</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Manage Payables</p>
                </div>

                <button
                    onClick={() => onOpenWindow('BILL', 'Enter Bills')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                    <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    Enter New Bill
                </button>

                <div className="flex flex-col gap-4 mt-2">
                    {metrics.map(metric => (
                        <SummaryCard
                            key={metric.id}
                            title={metric.title}
                            value={metric.value}
                            count={metric.count}
                            data={metric.data}
                            color={metric.color}
                            isActive={activeCategory === metric.id}
                            onClick={() => setActiveCategory(metric.id as any)}
                        />
                    ))}
                </div>


            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="p-10 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            {activeCategory === 'Receipts' ? 'Item Receipts' : `${activeCategory} Bills`}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search bills..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-600 focus:outline-none transition-all w-64 shadow-sm"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="flex-1 px-10 pb-10">
                    <BillTable
                        bills={filteredBills}
                        vendors={vendors}
                        searchTerm={searchTerm}
                        onOpenBill={(id) => {
                            const tx = transactions.find(t => t.id === id);
                            const viewType = tx?.type === 'RECEIVE_ITEM' ? 'ITEM_RECEIPT_DISPLAY' : 'BILL_DISPLAY';
                            onOpenWindow(viewType, `${tx?.type === 'RECEIVE_ITEM' ? 'Item Receipt' : 'Bill'} #${tx?.refNo}`, { transactionId: id });
                        }}
                        onEditBill={(id) => {
                            const tx = transactions.find(t => t.id === id);
                            if (tx) onOpenWindow('BILL', `Edit Bill #${tx.refNo}`, { initialData: tx });
                        }}
                        onDeleteBill={(id) => onDeleteTransaction(id)}
                        onPayBill={onPayBill}
                    />
                </div>
            </div>
        </div>
    );
};

export default BillCenter;
