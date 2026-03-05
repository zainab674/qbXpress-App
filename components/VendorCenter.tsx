
import React, { useState, useMemo } from 'react';
import { Vendor, Transaction } from '../types';
import SummaryCard from './VendorCenter/SummaryCard';
import VendorTable from './VendorCenter/VendorTable';

interface VendorCenterProps {
  vendors: Vendor[];
  transactions: Transaction[];
  onUpdateVendors: (v: Vendor[]) => void;
  onOpenForm: (initialData?: any) => void;
  onOpenWindow: (type: any, title: string, params?: any) => void; // Added for more navigation options
  onOpenBill: () => void;
  onOpenPay: () => void;
  onOpenPO: () => void;
  onOpenReceive: () => void;
  refreshData?: () => Promise<void>;
}

const VendorCenter: React.FC<VendorCenterProps> = ({
  vendors, transactions, onUpdateVendors, onOpenForm, onOpenWindow,
  onOpenBill, onOpenPay, onOpenPO, onOpenReceive, refreshData
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id);
  const [activeCategory, setActiveCategory] = useState('High Spend Vendors');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Helper to filter transactions by date range
  const getTransactionsInRange = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  };

  const last30DaysTx = useMemo(() => getTransactionsInRange(30), [transactions]);

  // Calculate Real Metrics
  const metrics = useMemo(() => {
    // 1. High Spend
    const spendPerVendor: Record<string, number> = {};
    last30DaysTx.forEach(t => {
      spendPerVendor[t.entityId] = (spendPerVendor[t.entityId] || 0) + t.total;
    });
    const sortedSpend = Object.entries(spendPerVendor).sort((a, b) => b[1] - a[1]);
    const topSpend = sortedSpend[0]?.[1] || 0;

    // 2. Most Frequent
    const freqPerVendor: Record<string, number> = {};
    last30DaysTx.forEach(t => {
      freqPerVendor[t.entityId] = (freqPerVendor[t.entityId] || 0) + 1;
    });
    const sortedFreq = Object.entries(freqPerVendor).sort((a, b) => b[1] - a[1]);
    const topFreq = sortedFreq[0]?.[1] || 0;

    // 3. New Vendors
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() - 30);
    const newVendorsCount = vendors.filter(v =>
      v.MetaData?.CreateTime ? new Date(v.MetaData.CreateTime) >= cutoff30 : false
    ).length;

    // 4. Rising Costs (heuristic: vendors with more spend this 15 days vs previous 15 days)
    const cutoff15 = new Date();
    cutoff15.setDate(cutoff15.getDate() - 15);
    const cutoffPrev15 = new Date();
    cutoffPrev15.setDate(cutoffPrev15.getDate() - 30);

    const countRising = vendors.filter(v => {
      const current15 = transactions.filter(t => t.entityId === v.id && new Date(t.date) >= cutoff15).length;
      const prev15 = transactions.filter(t => t.entityId === v.id && new Date(t.date) >= cutoffPrev15 && new Date(t.date) < cutoff15).length;
      return current15 > prev15;
    }).length;

    // 5. Needs Review
    const needsReviewCount = transactions.filter(t => t.status === 'OPEN').length;

    return { topSpend, topFreq, newVendorsCount, countRising, needsReviewCount };
  }, [vendors, transactions, last30DaysTx]);

  // Generate real trend data for sparklines (last 7 days)
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
    { id: 'high', title: 'High Spend Vendors', value: `$${metrics.topSpend.toLocaleString()}`, subtitle: 'spent last 30 days', color: '#3b82f6', chart: getTrendData(), icon: '📈' },
    { id: 'frequent', title: 'Most Frequent Vendors', value: `${metrics.topFreq} purchases`, subtitle: 'last 30 days', color: '#8b5cf6', chart: getTrendData(), icon: '📊' },
    { id: 'new', title: 'New Vendors', value: `${metrics.newVendorsCount} added`, subtitle: 'last 30 days', color: '#10b981', chart: [10, 15, 12, 18, 20, 22, 25, 28], icon: '👤' }, // Mocking new count trend as it's hard to track day-by-day creation
    { id: 'rising', title: 'Rising Costs', value: `${metrics.countRising} vendors`, subtitle: 'with rising costs', color: '#f59e0b', chart: getTrendData(), icon: '📉' },
    { id: 'review', title: 'Needs Review', value: `${metrics.needsReviewCount} transactions`, subtitle: 'need review', color: '#ef4444', chart: getTrendData(t => t.status === 'OPEN'), icon: '⚠️' }
  ];

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { importVendors } = await import('../services/api');
      await importVendors(file);
      alert('Vendors imported successfully!');
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to import vendors');
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteVendor = async (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    if (!vendor) return;

    const confirmed = window.confirm(
      `WARNING: Deleting the vendor "${vendor.name}" will permanently remove all associated transactions (bills, payments, etc.) and cannot be undone.\n\nAre you sure you want to proceed?`
    );

    if (!confirmed) return;

    try {
      const { deleteVendor } = await import('../services/api');
      await deleteVendor(id);
      alert('Vendor and all related transactions deleted successfully.');
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vendor');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `WARNING: Deleting ${selectedIds.length} vendors will permanently remove all associated transactions (bills, payments, etc.) and cannot be undone.\n\nAre you sure you want to proceed?`
    );

    if (!confirmed) return;

    try {
      const { bulkDeleteVendors } = await import('../services/api');
      await bulkDeleteVendors(selectedIds);
      alert('Selected vendors and all related transactions deleted successfully.');
      setSelectedIds([]);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete vendors');
    }
  };

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* Sidebar Area - Summary Cards */}
      <div className="w-[340px] border-r border-gray-200 flex flex-col bg-white p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Vendor Center</h1>
          <button
            onClick={() => onOpenForm()}
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
                  placeholder="Search vendors"
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
            <button onClick={onOpenBill} className="flex-1 max-w-[150px] bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm">
              Enter Bill
            </button>
            <button onClick={onOpenPay} className="flex-1 max-w-[150px] bg-white border-2 border-blue-600 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Pay Bill
            </button>
            <button onClick={() => onOpenWindow('VENDOR_CREDIT', 'Vendor Credit')} className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Vendor Credit
            </button>
            <button onClick={onOpenPO} className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Create PO
            </button>
            <button onClick={() => onOpenWindow('PURCHASE_ORDER_CENTER', 'PO Center')} className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              PO Center
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex-1 max-w-[150px] bg-red-50 border-2 border-red-200 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-2"
              >
                🗑️ Delete ({selectedIds.length})
              </button>
            )}
            <div className="flex-1 max-w-[150px]">
              <label className="flex items-center justify-center w-full h-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm cursor-pointer">
                Import
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleImport} />
              </label>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <VendorTable
            vendors={vendors}
            transactions={transactions}
            selectedVendorId={selectedVendorId}
            onSelectVendor={setSelectedVendorId}
            onOpenDetail={(vendor) => onOpenWindow('VENDOR_DETAIL', vendor.name, { vendorId: vendor.id })}
            onDeleteVendor={handleDeleteVendor}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorCenter;
