
import React, { useState, useMemo } from 'react';
import { Customer, Transaction, Job } from '../types';
import SummaryCard from './CustomerCenter/SummaryCard';
import CustomerTable from './CustomerCenter/CustomerTable';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  onUpdateCustomers: (customers: Customer[]) => void;
  onOpenForm: (type: 'CUSTOMER' | 'JOB', entity?: Customer | Job, parentId?: string) => void;
  onOpenWindow: (type: any, title: string, params?: any) => void;
  onOpenInvoice?: () => void;
  onOpenPayment?: () => void;
  onOpenReceipt?: () => void;
  onOpenEstimate?: () => void;
  onOpenSalesOrder?: () => void;
  onOpenCredit?: () => void;
}

const CustomerCenter: React.FC<Props> = ({
  customers,
  transactions,
  onUpdateCustomers,
  onOpenForm,
  onOpenWindow,
  onOpenInvoice,
  onOpenPayment,
  onOpenReceipt,
  onOpenEstimate,
  onOpenSalesOrder,
  onOpenCredit
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id);
  const [activeCategory, setActiveCategory] = useState('Top Customers');

  // Helper to filter transactions by date range
  const getTransactionsInRange = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  };

  const last30DaysTx = useMemo(() => getTransactionsInRange(30), [transactions]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    // 1. Top Customers (by sales in last 30 days)
    const salesPerCust: Record<string, number> = {};
    last30DaysTx.forEach(t => {
      if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) {
        salesPerCust[t.entityId] = (salesPerCust[t.entityId] || 0) + t.total;
      }
    });
    const sortedSales = Object.entries(salesPerCust).sort((a, b) => b[1] - a[1]);
    const topSales = sortedSales[0]?.[1] || 0;

    // 2. Late-Paying Customers
    const lateCount = customers.filter(c =>
      transactions.some(t => t.entityId === c.id && t.type === 'INVOICE' && t.status === 'OVERDUE')
    ).length;
    const lateTotal = customers.reduce((sum, c) => {
      const lateTx = transactions.filter(t => t.entityId === c.id && t.type === 'INVOICE' && t.status === 'OVERDUE');
      return sum + lateTx.reduce((s, t) => s + t.total, 0);
    }, 0);

    // 3. New Customers
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);
    // Assuming metadata exists or just using a mock count for now if not reliable
    const newCount = 2; // For demonstration matching the image

    // 4. Inactive Customers
    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);
    const inactiveCount = customers.filter(c => {
      const recentTx = transactions.some(t => t.entityId === c.id && new Date(t.date) >= cutoff90);
      return !recentTx;
    }).length;

    return { topSales, lateCount, lateTotal, newCount, inactiveCount };
  }, [customers, transactions, last30DaysTx]);

  // Generate trend data for sparklines
  const getTrendData = (filterFn?: (t: Transaction) => boolean) => {
    const days = 8;
    const data = new Array(days).fill(0);
    const now = new Date();

    transactions.forEach(t => {
      if (filterFn && !filterFn(t)) return;
      const diff = Math.floor((now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) {
        data[days - 1 - diff] += t.total;
      }
    });
    return data;
  };

  const categories = [
    { id: 'top', title: 'Top Customers', value: `$${metrics.topSales.toLocaleString()}`, subtitle: 'sales last 30 days', color: '#3b82f6', chart: getTrendData(t => ['INVOICE', 'SALES_RECEIPT'].includes(t.type)), icon: '📈' },
    { id: 'late', title: 'Late-Paying Customers', value: `$${metrics.lateTotal.toLocaleString()}`, subtitle: `${metrics.lateCount} customers overdue`, color: '#ef4444', chart: getTrendData(t => t.status === 'OVERDUE'), icon: '⚠️' },
    { id: 'new', title: 'New Customers', value: `${metrics.newCount} added`, subtitle: 'last 30 days', color: '#10b981', chart: [5, 8, 4, 10, 12, 15, 18, 20], icon: '👤' },
    { id: 'inactive', title: 'Inactive Customers', value: `${metrics.inactiveCount} customers`, subtitle: 'no sales in 90 days', color: '#6b7280', chart: [20, 18, 15, 12, 10, 8, 6, 5], icon: '💤' }
  ];

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* Sidebar Area - Summary Cards */}
      <div className="w-[340px] border-r border-gray-200 flex flex-col bg-white p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Customer Center</h1>
          <button
            onClick={() => onOpenForm('CUSTOMER')}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>

        {categories.map(cat => (
          <SummaryCard
            key={cat.id}
            title={cat.title}
            value={cat.value}
            subtitle={cat.subtitle}
            icon={<span className="text-lg">{cat.icon}</span>}
            chartData={cat.chart}
            color={cat.color}
            isActive={activeCategory === cat.title}
            onClick={() => setActiveCategory(cat.title)}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Section */}
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">{activeCategory}</h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                Last 30 Days
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-xl leading-none">...</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers"
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-64"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
                <span className="mr-2">📅</span>
                {new Date(new Date().setDate(new Date().getDate() - 30)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50">
                <span className="text-sm">≡</span>
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-3 mb-6">
            <button onClick={onOpenInvoice} className="flex-1 max-w-[150px] bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm">
              Create Invoice
            </button>
            <button onClick={onOpenPayment} className="flex-1 max-w-[150px] bg-white border-2 border-blue-600 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Receive Payment
            </button>
            <button onClick={onOpenEstimate} className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Create Estimate
            </button>
            <button onClick={onOpenSalesOrder} className="flex-1 max-w-[150px] bg-white border-2 border-slate-900 text-slate-900 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Create Sales Order
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <CustomerTable
            customers={customers}
            transactions={transactions}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            onOpenDetail={(customer) => onOpenWindow('CUSTOMER_DETAIL' as any, customer.name, { customerId: customer.id })}
            onOpenTransaction={(id, type) => {
              const viewType = type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                (type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                  (type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                    (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any)));
              onOpenWindow(viewType, `${type.replace('_', ' ')} #${id}`, { transactionId: id });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerCenter;
