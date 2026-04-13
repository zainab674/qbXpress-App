
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  onOpenDelayedCharge?: () => void;
  onOpenDelayedCredit?: () => void;
  refreshData?: () => Promise<void>;
}

const CustomerCenter: React.FC<Props> = ({
  customers,
  transactions,
  onUpdateCustomers,
  onOpenForm,
  onOpenWindow,
  onOpenInvoice,
  onOpenPayment,
  onOpenEstimate,
  onOpenSalesOrder,
  onOpenDelayedCharge,
  onOpenDelayedCredit,
  refreshData
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id);
  const [activeCategory, setActiveCategory] = useState('All Customers');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showAgingPanel, setShowAgingPanel] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setShowColumnsMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getTransactionsInRange = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  };

  const last30DaysTx = useMemo(() => getTransactionsInRange(30), [transactions]);

  const metrics = useMemo(() => {
    const salesPerCust: Record<string, number> = {};
    last30DaysTx.forEach(t => {
      if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) {
        salesPerCust[t.entityId] = (salesPerCust[t.entityId] || 0) + t.total;
      }
    });
    const topSales = Object.values(salesPerCust).sort((a, b) => b - a)[0] || 0;

    const lateCount = customers.filter(c =>
      transactions.some(t => t.entityId === c.id && t.type === 'INVOICE' && t.status === 'OVERDUE')
    ).length;
    const lateTotal = customers.reduce((sum, c) => {
      return sum + transactions.filter(t => t.entityId === c.id && t.type === 'INVOICE' && t.status === 'OVERDUE').reduce((s, t) => s + t.total, 0);
    }, 0);

    const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
    const newCount = customers.filter(c => new Date(c.createdAt || 0) >= cutoff30).length;

    const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90);
    const inactiveCount = customers.filter(c => !transactions.some(t => t.entityId === c.id && new Date(t.date) >= cutoff90)).length;

    return { topSales, lateCount, lateTotal, newCount, inactiveCount };
  }, [customers, transactions, last30DaysTx]);

  // Aging buckets across all customers
  const agingData = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
    transactions.forEach(t => {
      if (t.type !== 'INVOICE' || !['OPEN', 'OVERDUE'].includes(t.status)) return;
      const age = Math.floor((now.getTime() - new Date(t.date).getTime()) / 86400000);
      if (age <= 30)       buckets.current   += t.total;
      else if (age <= 60)  buckets.days31_60 += t.total;
      else if (age <= 90)  buckets.days61_90 += t.total;
      else                 buckets.over90    += t.total;
      buckets.total += t.total;
    });
    return buckets;
  }, [transactions]);

  const getTrendData = (filterFn?: (t: Transaction) => boolean) => {
    const days = 8;
    const data = new Array(days).fill(0);
    const now = new Date();
    transactions.forEach(t => {
      if (filterFn && !filterFn(t)) return;
      const diff = Math.floor((now.getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) data[days - 1 - diff] += t.total;
    });
    return data;
  };

  const categories = [
    { id: 'all',      title: 'All Customers',         value: `${customers.filter(c => c.isActive !== false).length} total`,  subtitle: 'active customers',         color: '#8b5cf6', chart: getTrendData(), icon: '👥' },
    { id: 'top',      title: 'Top Customers',         value: `$${metrics.topSales.toLocaleString()}`,   subtitle: 'sales last 30 days',       color: '#3b82f6', chart: getTrendData(t => ['INVOICE', 'SALES_RECEIPT'].includes(t.type)), icon: '📈' },
    { id: 'late',     title: 'Late-Paying Customers', value: `$${metrics.lateTotal.toLocaleString()}`, subtitle: `${metrics.lateCount} customers overdue`, color: '#ef4444', chart: getTrendData(t => t.status === 'OVERDUE'), icon: '⚠️' },
    { id: 'new',      title: 'New Customers',         value: `${metrics.newCount} added`,             subtitle: 'last 30 days',             color: '#10b981', chart: [5, 8, 4, 10, 12, 15, 18, 20], icon: '👤' },
    { id: 'inactive', title: 'Inactive Customers',    value: `${metrics.inactiveCount} customers`,    subtitle: 'no sales in 90 days',      color: '#6b7280', chart: [20, 18, 15, 12, 10, 8, 6, 5], icon: '💤' }
  ];

  // ── Filtered customers ───────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    let list = showInactive ? customers : customers.filter(c => c.isActive !== false);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }
    if (activeCategory === 'Top Customers') {
      const salesPerCust: Record<string, number> = {};
      last30DaysTx.forEach(t => {
        if (['INVOICE', 'SALES_RECEIPT'].includes(t.type)) {
          salesPerCust[t.entityId] = (salesPerCust[t.entityId] || 0) + t.total;
        }
      });
      list = list
        .filter(c => salesPerCust[c.id] > 0)
        .sort((a, b) => (salesPerCust[b.id] || 0) - (salesPerCust[a.id] || 0));
    } else if (activeCategory === 'Late-Paying Customers') {
      const lateIds = new Set(transactions.filter(t => t.type === 'INVOICE' && t.status === 'OVERDUE').map(t => t.entityId));
      list = list.filter(c => lateIds.has(c.id));
    } else if (activeCategory === 'Inactive Customers') {
      const cutoff90 = new Date(); cutoff90.setDate(cutoff90.getDate() - 90);
      list = list.filter(c => !transactions.some(t => t.entityId === c.id && new Date(t.date) >= cutoff90));
    } else if (activeCategory === 'New Customers') {
      const cutoff30 = new Date(); cutoff30.setDate(cutoff30.getDate() - 30);
      list = list.filter(c => new Date((c as any).createdAt || 0) >= cutoff30);
    }
    return list;
  }, [customers, transactions, last30DaysTx, searchQuery, showInactive, activeCategory]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { importCustomers } = await import('../services/api');
      await importCustomers(file);
      alert('Customers imported successfully!');
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to import customers');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    if (!window.confirm(`WARNING: Deleting "${customer.name}" will permanently remove all associated transactions.\n\nProceed?`)) return;
    try {
      const { deleteCustomer } = await import('../services/api');
      await deleteCustomer(id);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`WARNING: Deleting ${selectedIds.length} customers will permanently remove all associated transactions.\n\nProceed?`)) return;
    try {
      const { bulkDeleteCustomers } = await import('../services/api');
      await bulkDeleteCustomers(selectedIds);
      setSelectedIds([]);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customers');
    }
  };

  const handleToggleInactive = async (id: string, isActive: boolean) => {
    try {
      const { makeCustomerInactive } = await import('../services/api');
      await makeCustomerInactive(id, isActive);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer status');
    }
  };

  const handleSendStatement = async (id?: string) => {
    const targetId = id || selectedCustomerId;
    if (!targetId) { alert('Please select a customer first.'); return; }
    try {
      const { getCustomerStatement } = await import('../services/api');
      const statement = await getCustomerStatement(targetId);
      // Show statement in a new window
      onOpenWindow('CUSTOMER_STATEMENT' as any, `Statement: ${statement.customer.name}`, { statement });
    } catch (err: any) {
      alert(err.message || 'Failed to generate statement');
    }
  };

  const handleBulkMakeInactive = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { makeCustomerInactive } = await import('../services/api');
      await Promise.all(selectedIds.map(id => makeCustomerInactive(id, false)));
      setSelectedIds([]);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update customers');
    }
  };

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-8 pb-4">
          {/* Top bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{activeCategory}</h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
              </span>

              {/* ... actions dropdown */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={() => setShowActionsMenu(v => !v)}
                  className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-bold"
                  title="More actions"
                >
                  •••
                </button>
                {showActionsMenu && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 text-sm">
                    <button
                      onClick={() => { setShowAgingPanel(v => !v); setShowActionsMenu(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 font-medium"
                    >
                      {showAgingPanel ? 'Hide' : 'Show'} Aging Summary
                    </button>
                    <button
                      onClick={() => { handleSendStatement(); setShowActionsMenu(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 font-medium"
                    >
                      Send Statement
                    </button>
                    <hr className="my-1 border-gray-100" />
                    {selectedIds.length > 0 && (
                      <>
                        <button
                          onClick={() => { handleBulkMakeInactive(); setShowActionsMenu(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 font-medium"
                        >
                          Make {selectedIds.length} Inactive
                        </button>
                        <button
                          onClick={() => { handleBulkDelete(); setShowActionsMenu(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 font-medium"
                        >
                          Delete {selectedIds.length} Selected
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-64"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Show inactive toggle */}
              <button
                onClick={() => setShowInactive(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${showInactive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                title="Toggle inactive customers"
              >
                <span>{showInactive ? '👁' : '🙈'}</span>
                {showInactive ? 'Showing Inactive' : 'Hide Inactive'}
              </button>

              {/* Columns menu */}
              <div className="relative" ref={columnsMenuRef}>
                <button
                  onClick={() => setShowColumnsMenu(v => !v)}
                  className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Table options"
                >
                  <span className="text-sm">≡</span>
                </button>
                {showColumnsMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 text-sm">
                    <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Sort By</p>
                    {['Name', 'Balance', 'Last Activity', 'Transactions'].map(opt => (
                      <button key={opt} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">
                        {opt}
                      </button>
                    ))}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => { handleSendStatement(); setShowColumnsMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      Export to CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button onClick={onOpenInvoice} className="bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm">
              Create Invoice
            </button>
            <button onClick={onOpenPayment} className="bg-white border-2 border-blue-600 text-blue-600 font-bold py-2.5 px-4 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Receive Payment
            </button>
            <button onClick={onOpenEstimate} className="bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Create Estimate
            </button>
            <button onClick={onOpenSalesOrder} className="bg-white border-2 border-slate-900 text-slate-900 font-bold py-2.5 px-4 rounded-xl hover:bg-slate-50 transition-colors text-sm">
              Sales Order
            </button>
            <button onClick={onOpenDelayedCharge} className="bg-green-50 border-2 border-green-600 text-green-700 font-bold py-2.5 px-4 rounded-xl hover:bg-green-100 transition-colors text-sm">
              Delayed Charge
            </button>
            <button onClick={onOpenDelayedCredit} className="bg-red-50 border-2 border-red-600 text-red-700 font-bold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors text-sm">
              Delayed Credit
            </button>
            <button
              onClick={() => handleSendStatement()}
              className="bg-purple-50 border-2 border-purple-600 text-purple-700 font-bold py-2.5 px-4 rounded-xl hover:bg-purple-100 transition-colors text-sm"
            >
              Send Statement
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-50 border-2 border-red-200 text-red-600 font-bold py-2.5 px-4 rounded-xl hover:bg-red-100 transition-colors text-sm flex items-center gap-2"
              >
                🗑️ Delete ({selectedIds.length})
              </button>
            )}
            <label className="bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm cursor-pointer">
              Import
              <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
            </label>
          </div>

          {/* Aging Summary Panel */}
          {showAgingPanel && (
            <div className="mb-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">A/R Aging Summary</h3>
              <div className="grid grid-cols-5 gap-4 text-center">
                {[
                  { label: 'Current (0–30)', value: agingData.current, color: 'text-green-700 bg-green-50' },
                  { label: '31–60 Days',     value: agingData.days31_60, color: 'text-amber-700 bg-amber-50' },
                  { label: '61–90 Days',     value: agingData.days61_90, color: 'text-orange-700 bg-orange-50' },
                  { label: '90+ Days',       value: agingData.over90, color: 'text-red-700 bg-red-50' },
                  { label: 'Total A/R',      value: agingData.total, color: 'text-blue-700 bg-blue-50' },
                ].map(b => (
                  <div key={b.label} className={`rounded-xl p-4 ${b.color}`}>
                    <p className="text-xs font-bold opacity-70 mb-1">{b.label}</p>
                    <p className="text-lg font-black">${b.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400 italic">
              {searchQuery ? `No customers matching "${searchQuery}"` : 'No customers found.'}
            </div>
          ) : (
            <CustomerTable
              customers={filteredCustomers}
              transactions={transactions}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onOpenDetail={(customer) => onOpenWindow('CUSTOMER_DETAIL' as any, customer.name, { customerId: customer.id })}
              onEditCustomer={(customer) => onOpenForm('CUSTOMER', customer)}
              onOpenTransaction={(id, type) => {
                const viewType = type === 'INVOICE' ? 'INVOICE_DISPLAY' :
                  (type === 'ESTIMATE' ? 'ESTIMATE_DISPLAY' :
                    (type === 'SALES_ORDER' ? 'SALES_ORDER_DISPLAY' :
                      (type === 'PAYMENT' ? 'PAYMENT_DISPLAY' : type as any)));
                onOpenWindow(viewType, `${type.replace('_', ' ')} #${id}`, { transactionId: id });
              }}
              onDeleteCustomer={handleDeleteCustomer}
              onToggleInactive={handleToggleInactive}
              onSendStatement={handleSendStatement}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerCenter;
