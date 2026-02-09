import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Term, ViewState } from '../types';
import SummaryCard from './InvoiceCenter/SummaryCard';
import InvoiceTable from './InvoiceCenter/InvoiceTable';

interface Props {
    transactions: Transaction[];
    customers: Customer[];
    terms: Term[];
    onOpenInvoice: (invoice: Transaction) => void;
    onOpenNewInvoice: () => void;
    onOpenWindow: (type: any, title: string, params?: any) => void;
}

const InvoiceCenter: React.FC<Props> = ({
    transactions,
    customers,
    terms,
    onOpenInvoice,
    onOpenNewInvoice,
    onOpenWindow
}) => {
    const [activeCategory, setActiveCategory] = useState('All Invoices');
    const [searchQuery, setSearchQuery] = useState('');

    const invoices = useMemo(() => transactions.filter(t => t.type === 'INVOICE'), [transactions]);

    const isOverdue = (t: Transaction) => {
        if (t.status === 'PAID') return false;
        if (t.status === 'OVERDUE') return true;

        const dueStr = t.dueDate;
        let dueDate: Date;

        if (dueStr) {
            dueDate = new Date(dueStr);
        } else {
            // Fallback: calculate from date and terms
            dueDate = new Date(t.date);
            if (isNaN(dueDate.getTime())) return false;

            const termObj = terms.find(term => term.name === t.terms);
            if (termObj) {
                dueDate.setDate(dueDate.getDate() + (termObj.stdDueDays || 0));
            } else if (t.terms?.toLowerCase().includes('receipt')) {
                // Keep it as invoice date
            } else {
                dueDate.setDate(dueDate.getDate() + 30); // Default Net 30
            }
        }

        // Use a 1-day grace period or just strict comparison
        // To be safe and meet user expectation, direct comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
    };

    const handleReceivePayment = (invoice: Transaction) => {
        onOpenWindow('RECEIVE_PAYMENT', 'Receive Payment', {
            customerId: invoice.entityId,
            invoiceId: invoice.id
        });
    };

    const metrics = useMemo(() => {
        const allInvoices = invoices;
        const paidInvoices = invoices.filter(t => t.status === 'PAID');
        const overdueInvoices = invoices.filter(isOverdue);
        const unpaidInvoices = invoices.filter(t =>
            (t.status === 'UNPAID' || !t.status || t.status === 'OPEN') && !isOverdue(t)
        );

        return {
            all: { count: allInvoices.length, total: allInvoices.reduce((sum, t) => sum + t.total, 0) },
            paid: { count: paidInvoices.length, total: paidInvoices.reduce((sum, t) => sum + t.total, 0) },
            unpaid: { count: unpaidInvoices.length, total: unpaidInvoices.reduce((sum, t) => sum + t.total, 0) },
            overdue: { count: overdueInvoices.length, total: overdueInvoices.reduce((sum, t) => sum + t.total, 0) }
        };
    }, [invoices, isOverdue]);

    const filteredInvoices = useMemo(() => {
        let result = invoices;
        if (activeCategory === 'Unpaid Invoices') {
            result = invoices.filter(t => (t.status === 'UNPAID' || !t.status || t.status === 'OPEN') && !isOverdue(t));
        } else if (activeCategory === 'Paid Invoices') {
            result = invoices.filter(t => t.status === 'PAID');
        } else if (activeCategory === 'Overdue Invoices') {
            result = invoices.filter(isOverdue);
        } else if (activeCategory === 'All Invoices') {
            result = invoices;
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(inv => {
                const custName = customers.find(c => c.id === inv.entityId)?.name || '';
                return custName.toLowerCase().includes(q) || inv.refNo.toLowerCase().includes(q);
            });
        }
        return result;
    }, [invoices, activeCategory, searchQuery, customers, isOverdue]);

    const getTrendData = () => [4200, 3800, 5100, 4900, 6200, 5800, 7100, 6500];

    const categories = [
        { title: 'All Invoices', value: metrics.all.count, subtitle: 'full history', valueDisplay: `$${metrics.all.total.toLocaleString()}`, color: '#6366f1', chart: [400, 450, 420, 480, 500, 550, 600], icon: '📋' },
        { title: 'Unpaid Invoices', value: metrics.unpaid.count, subtitle: 'pending payment', valueDisplay: `$${metrics.unpaid.total.toLocaleString()}`, color: '#3b82f6', chart: [300, 350, 400, 380, 450, 500, 550], icon: '📤' },
        { title: 'Paid Invoices', value: metrics.paid.count, subtitle: 'completed', valueDisplay: `$${metrics.paid.total.toLocaleString()}`, color: '#10b981', chart: [200, 250, 300, 350, 400, 450], icon: '✅' },
        { title: 'Overdue Invoices', value: metrics.overdue.count, subtitle: 'past due date', valueDisplay: `$${metrics.overdue.total.toLocaleString()}`, color: '#f43f5e', chart: [50, 70, 60, 90, 80, 110, 130], icon: '⚠️' }
    ];

    return (
        <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
            {/* Sidebar Metrics */}
            <div className="w-[360px] border-r border-slate-200 flex flex-col bg-white p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Invoices</h1>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Management Center</span>
                    </div>
                    <button
                        onClick={onOpenNewInvoice}
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white hover:scale-110 active:scale-95 transition-all shadow-xl shadow-blue-200 flex items-center justify-center font-black text-xl"
                    >
                        +
                    </button>
                </div>

                <div className="space-y-4">
                    {categories.map(cat => (
                        <SummaryCard
                            key={cat.title}
                            title={cat.title}
                            value={cat.valueDisplay}
                            subtitle={cat.subtitle}
                            icon={<span className="text-lg">{cat.icon}</span>}
                            chartData={cat.chart}
                            color={cat.color}
                            isActive={activeCategory === cat.title}
                            onClick={() => setActiveCategory(cat.title)}
                        />
                    ))}
                </div>


            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="p-10 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{activeCategory}</h2>

                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search customers or invoice #"
                                className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm transition-all w-80 group-hover:shadow-md"
                            />
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-hover:scale-110 transition-transform">🔍</span>
                        </div>
                        <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                            <span className="text-xl leading-none italic font-black">≡</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                    <InvoiceTable
                        invoices={filteredInvoices}
                        customers={customers}
                        onOpenInvoice={onOpenInvoice}
                        onReceivePayment={handleReceivePayment}
                    />
                </main>
            </div>
        </div>
    );
};

export default InvoiceCenter;
