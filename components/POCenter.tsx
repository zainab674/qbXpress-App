
import React, { useState, useMemo } from 'react';
import { Transaction, Vendor, ViewState } from '../types';
import SummaryCard from './POCenter/SummaryCard';
import POTable from './POCenter/POTable';

interface POCenterProps {
    transactions: Transaction[];
    vendors: Vendor[];
    onOpenWindow: (type: ViewState, title: string, params?: any) => void;
    onSaveTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
}

const POCenter: React.FC<POCenterProps> = ({ transactions, vendors, onOpenWindow, onSaveTransaction, onDeleteTransaction }) => {
    const [activeCategory, setActiveCategory] = useState<'All' | 'Open' | 'Overdue' | 'Received' | 'PendingApproval'>('All');
    const [searchTerm, setSearchTerm] = useState('');

    const allPOs = useMemo(() =>
        transactions.filter(t => t.type === 'PURCHASE_ORDER'),
        [transactions]);

    const openPOs = useMemo(() =>
        allPOs.filter(po => po.status === 'OPEN'),
        [allPOs]);

    const receivedPOs = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return allPOs.filter(po => po.status === 'RECEIVED' && new Date(po.date) >= cutoff);
    }, [allPOs]);

    const overduePOs = useMemo(() =>
        openPOs.filter(po => po.expectedDate && new Date(po.expectedDate) < new Date()),
        [openPOs]);

    const pendingApprovalPOs = useMemo(() =>
        allPOs.filter(po => (po as any).approvalStatus === 'PENDING_APPROVAL'),
        [allPOs]);

    const filteredPOs = useMemo(() => {
        switch (activeCategory) {
            case 'Open': return openPOs;
            case 'Overdue': return overduePOs;
            case 'Received': return receivedPOs;
            case 'PendingApproval': return pendingApprovalPOs;
            default: return allPOs;
        }
    }, [activeCategory, allPOs, openPOs, overduePOs, receivedPOs, pendingApprovalPOs]);

    const metrics = [
        {
            id: 'Open',
            title: 'Open Purchase Orders',
            value: `$${openPOs.reduce((acc, p) => acc + p.total, 0).toLocaleString()}`,
            count: openPOs.length,
            data: [20, 30, 25, 45, 30, 50, 48],
            color: '#3b82f6'
        },
        {
            id: 'Received',
            title: 'Received POs (30d)',
            value: `$${receivedPOs.reduce((acc, p) => acc + p.total, 0).toLocaleString()}`,
            count: receivedPOs.length,
            data: [15, 25, 35, 20, 40, 35, 45],
            color: '#10b981'
        },
        {
            id: 'Overdue',
            title: 'Overdue POs',
            value: `$${overduePOs.reduce((acc, p) => acc + p.total, 0).toLocaleString()}`,
            count: overduePOs.length,
            data: [5, 12, 8, 15, 10, 20, 18],
            color: '#ef4444'
        },
        {
            id: 'PendingApproval',
            title: 'Pending Approval',
            value: `$${pendingApprovalPOs.reduce((acc, p) => acc + p.total, 0).toLocaleString()}`,
            count: pendingApprovalPOs.length,
            data: [2, 4, 3, 6, 5, 8, 7],
            color: '#f59e0b'
        }
    ];

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar Metrics */}
            <div className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-1 mb-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">PO Center</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Procurement Control</p>
                </div>

                <button
                    onClick={() => onOpenWindow('PURCHASE_ORDER', 'Create Purchase Order')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                    <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    New Purchase Order
                </button>

                <div className="flex flex-col gap-4 mt-2">
                    <SummaryCard
                        title="All Active POs"
                        value={`$${allPOs.reduce((acc, p) => acc + p.total, 0).toLocaleString()}`}
                        count={allPOs.length}
                        data={[30, 45, 35, 50, 40, 60, 55]}
                        color="#6366f1"
                        isActive={activeCategory === 'All'}
                        onClick={() => setActiveCategory('All')}
                    />
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
                            {activeCategory === 'PendingApproval' ? 'Pending Approval' : activeCategory} Purchase Orders
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search POs..."
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
                    <POTable
                        pos={filteredPOs}
                        vendors={vendors}
                        searchTerm={searchTerm}
                        onOpenPO={(id) => onOpenWindow('PURCHASE_ORDER_DISPLAY', `Purchase Order #${transactions.find(t => t.id === id)?.refNo}`, { transactionId: id })}
                        onConvertToBill={(id) => {
                            const po = transactions.find(t => t.id === id);
                            if (po) onOpenWindow('BILL', 'Enter Bills', { initialData: po });
                        }}
                        onMarkBackorder={(id: string, status: 'FULL' | 'PARTIAL' | 'NONE') => {
                            const po = transactions.find(t => t.id === id);
                            if (po) {
                                const { _id, __v, ...clean } = po as any;
                                onSaveTransaction({ ...clean, backorderStatus: status });
                            }
                        }}
                        onEditPO={(id) => {
                            const po = transactions.find(t => t.id === id);
                            if (po) onOpenWindow('PURCHASE_ORDER', `Edit PO #${po.refNo}`, { initialData: po });
                        }}
                        onDeletePO={(id) => onDeleteTransaction(id)}
                    />
                </div>
            </div>
        </div>
    );
};

export default POCenter;
