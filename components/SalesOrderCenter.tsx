
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, ViewState } from '../types';
import SummaryCard from './SalesOrderCenter/SummaryCard';
import SOTable from './SalesOrderCenter/SOTable';

interface SalesOrderCenterProps {
    transactions: Transaction[];
    customers: Customer[];
    onOpenWindow: (type: ViewState, title: string, params?: any) => void;
    onSaveTransaction: (tx: Transaction) => void;
}

const SalesOrderCenter: React.FC<SalesOrderCenterProps> = ({ transactions, customers, onOpenWindow, onSaveTransaction }) => {
    const [activeCategory, setActiveCategory] = useState<'All' | 'Open' | 'Converted' | 'Closed' | 'Backordered' | 'PendingFulfillment'>('All');
    const [searchTerm, setSearchTerm] = useState('');

    const allSOs = useMemo(() =>
        transactions.filter(t => t.type === 'SALES_ORDER'),
        [transactions]);

    const openSOs = useMemo(() =>
        allSOs.filter(so => !so.status || so.status.toLowerCase() === 'open'),
        [allSOs]);

    const convertedSOs = useMemo(() =>
        allSOs.filter(so => so.status?.toLowerCase() === 'converted'),
        [allSOs]);

    const closedSOs = useMemo(() =>
        allSOs.filter(so => so.status?.toLowerCase() === 'closed'),
        [allSOs]);

    const backorderedSOs = useMemo(() =>
        allSOs.filter(so => so.backorderStatus === 'FULL' || so.backorderStatus === 'PARTIAL'),
        [allSOs]);

    const pendingFulfillmentSOs = useMemo(() =>
        allSOs.filter(so => {
            const fs = (so as any).fulfillmentStatus;
            return fs === 'UNFULFILLED' || fs === 'PARTIALLY_FULFILLED';
        }),
        [allSOs]);

    const filteredSOs = useMemo(() => {
        switch (activeCategory) {
            case 'Open': return openSOs;
            case 'Converted': return convertedSOs;
            case 'Closed': return closedSOs;
            case 'Backordered': return backorderedSOs;
            case 'PendingFulfillment': return pendingFulfillmentSOs;
            default: return allSOs;
        }
    }, [activeCategory, allSOs, openSOs, convertedSOs, closedSOs, backorderedSOs, pendingFulfillmentSOs]);

    const metrics = [
        {
            id: 'Open',
            title: 'Open Sales Orders',
            value: `$${openSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`,
            count: openSOs.length,
            data: [20, 30, 25, 45, 30, 50, 48],
            color: '#3b82f6'
        },
        {
            id: 'Converted',
            title: 'Converted to Invoice',
            value: `$${convertedSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`,
            count: convertedSOs.length,
            data: [15, 25, 35, 20, 40, 35, 45],
            color: '#10b981'
        },
        {
            id: 'Closed',
            title: 'Closed SOs',
            value: `$${closedSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`,
            count: closedSOs.length,
            data: [5, 12, 8, 15, 10, 20, 18],
            color: '#6366f1'
        },
        {
            id: 'PendingFulfillment',
            title: 'Pending Fulfillment',
            value: `$${pendingFulfillmentSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`,
            count: pendingFulfillmentSOs.length,
            data: [8, 14, 10, 18, 12, 22, 20],
            color: '#7c3aed'
        }
    ];

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar Metrics */}
            <div className="w-80 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-1 mb-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Sales Order Center</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Revenue Pipeline</p>
                </div>

                <button
                    onClick={() => onOpenWindow('SALES_ORDER', 'Create Sales Order')}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                >
                    <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    New Sales Order
                </button>

                <div className="flex flex-col gap-4 mt-2">
                    <SummaryCard
                        title="All Sales Orders"
                        value={`$${allSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`}
                        count={allSOs.length}
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
                    <SummaryCard
                        title="Backordered"
                        value={`$${backorderedSOs.reduce((acc, s) => acc + s.total, 0).toLocaleString()}`}
                        count={backorderedSOs.length}
                        data={[8, 12, 10, 15, 11, 18, 14]}
                        color="#ef4444"
                        isActive={activeCategory === 'Backordered'}
                        onClick={() => setActiveCategory('Backordered')}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="p-10 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            {activeCategory === 'PendingFulfillment' ? 'Pending Fulfillment' : activeCategory} Sales Orders
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search SOs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-blue-600 focus:outline-none transition-all w-64 shadow-sm"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </header>

                <div className="flex-1 px-10 pb-10">
                    <SOTable
                        sos={filteredSOs}
                        customers={customers}
                        searchTerm={searchTerm}
                        onOpenSO={(id) => onOpenWindow('SALES_ORDER_DISPLAY', `Sales Order #${transactions.find(t => t.id === id)?.refNo}`, { transactionId: id })}
                        onMarkBackorder={(id: string, status: 'FULL' | 'PARTIAL' | 'NONE') => {
                            const so = transactions.find(t => t.id === id);
                            if (so) {
                                const { _id, __v, ...clean } = so as any;
                                onSaveTransaction({ ...clean, backorderStatus: status });
                            }
                        }}
                        onConvertToInvoice={(id) => {
                            const so = transactions.find(t => t.id === id);
                            if (so) {
                                const { _id, __v, ...cleanSO } = so as any;
                                const updatedSO = { ...cleanSO, status: 'Converted' };
                                onSaveTransaction(updatedSO);

                                const { id: soId, refNo: _refNo, ...invoiceData } = updatedSO;
                                onOpenWindow('INVOICE', 'Invoice', { initialData: { ...invoiceData, linkedDocumentIds: [soId] } as any });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderCenter;
