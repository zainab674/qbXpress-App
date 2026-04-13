
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vendor, Transaction } from '../types';
import SummaryCard from './VendorCenter/SummaryCard';
import VendorTable from './VendorCenter/VendorTable';

interface VendorCenterProps {
  vendors: Vendor[];
  transactions: Transaction[];
  onUpdateVendors: (v: Vendor[]) => void;
  onOpenForm: (initialData?: any) => void;
  onOpenWindow: (type: any, title: string, params?: any) => void;
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
  const [activeCategory, setActiveCategory] = useState('All Vendors');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showMenuOpen, setShowMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ days: 30 });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenuOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDatePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getTransactionsInRange = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  };

  const recentTx = useMemo(() => getTransactionsInRange(dateRange.days), [transactions, dateRange.days]);

  // Calculate Real Metrics
  const metrics = useMemo(() => {
    const spendPerVendor: Record<string, number> = {};
    recentTx.forEach(t => {
      spendPerVendor[t.entityId] = (spendPerVendor[t.entityId] || 0) + t.total;
    });
    const sortedSpend = Object.entries(spendPerVendor).sort((a, b) => b[1] - a[1]);
    const topSpend = sortedSpend[0]?.[1] || 0;

    const freqPerVendor: Record<string, number> = {};
    recentTx.forEach(t => {
      freqPerVendor[t.entityId] = (freqPerVendor[t.entityId] || 0) + 1;
    });
    const sortedFreq = Object.entries(freqPerVendor).sort((a, b) => b[1] - a[1]);
    const topFreq = sortedFreq[0]?.[1] || 0;

    const cutoffNew = new Date();
    cutoffNew.setDate(cutoffNew.getDate() - dateRange.days);
    const newVendorsCount = vendors.filter(v => {
      const created = v.MetaData?.CreateTime || (v as any).createdAt;
      return created ? new Date(created) >= cutoffNew : false;
    }).length;

    const half = Math.floor(dateRange.days / 2);
    const cutoffCurrent = new Date();
    cutoffCurrent.setDate(cutoffCurrent.getDate() - half);
    const cutoffPrev = new Date();
    cutoffPrev.setDate(cutoffPrev.getDate() - dateRange.days);
    const countRising = vendors.filter(v => {
      const curSpend = transactions.filter(t => t.entityId === v.id && new Date(t.date) >= cutoffCurrent).reduce((sum, t) => sum + t.total, 0);
      const prevSpend = transactions.filter(t => t.entityId === v.id && new Date(t.date) >= cutoffPrev && new Date(t.date) < cutoffCurrent).reduce((sum, t) => sum + t.total, 0);
      return curSpend > prevSpend;
    }).length;

    const needsReviewCount = recentTx.filter(t => t.status === 'OPEN').length;

    return { topSpend, topFreq, newVendorsCount, countRising, needsReviewCount };
  }, [vendors, transactions, recentTx, dateRange.days]);

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
    { id: 'all',      title: 'All Vendors',           value: `${vendors.length} vendors`,                 subtitle: 'total vendors',                      color: '#64748b', chart: [10, 12, 14, 13, 15, 16, 18, 20],          icon: '🏢' },
    { id: 'high',     title: 'High Spend Vendors',    value: `$${metrics.topSpend.toLocaleString()}`,     subtitle: `spent last ${dateRange.days} days`, color: '#3b82f6', chart: getTrendData(),                             icon: '📈' },
    { id: 'frequent', title: 'Most Frequent Vendors', value: `${metrics.topFreq} purchases`,              subtitle: `last ${dateRange.days} days`,        color: '#8b5cf6', chart: getTrendData(),                             icon: '📊' },
    { id: 'new',      title: 'New Vendors',           value: `${metrics.newVendorsCount} added`,          subtitle: `last ${dateRange.days} days`,        color: '#10b981', chart: [10, 15, 12, 18, 20, 22, 25, 28],          icon: '👤' },
    { id: 'rising',   title: 'Rising Costs',          value: `${metrics.countRising} vendors`,            subtitle: 'with rising costs',                  color: '#f59e0b', chart: getTrendData(),                             icon: '📉' },
    { id: 'review',   title: 'Needs Review',          value: `${metrics.needsReviewCount} transactions`,  subtitle: 'need review',                        color: '#ef4444', chart: getTrendData(t => t.status === 'OPEN'),     icon: '⚠️' },
  ];

  // Filter vendors for table based on active category, search, and active/inactive
  const filteredVendors = useMemo(() => {
    let list = vendors.filter(v => showInactive ? !v.isActive : v.isActive !== false);

    // Helper: get all IDs a transaction references for a vendor
    const txVendorId = (t: Transaction) => t.entityId || (t as any).vendorId;

    // Category filter
    if (activeCategory === 'All Vendors') {
      // no additional filtering — show all
    } else if (activeCategory === 'High Spend Vendors') {
      const spendMap: Record<string, number> = {};
      recentTx.forEach(t => {
        const id = txVendorId(t);
        if (id) spendMap[id] = (spendMap[id] || 0) + t.total;
      });
      list = list.sort((a, b) => (spendMap[b.id] || 0) - (spendMap[a.id] || 0));
    } else if (activeCategory === 'Most Frequent Vendors') {
      const freqMap: Record<string, number> = {};
      recentTx.forEach(t => {
        const id = txVendorId(t);
        if (id) freqMap[id] = (freqMap[id] || 0) + 1;
      });
      list = list.sort((a, b) => (freqMap[b.id] || 0) - (freqMap[a.id] || 0));
    } else if (activeCategory === 'New Vendors') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dateRange.days);
      list = list.filter(v => {
        const created = v.MetaData?.CreateTime || (v as any).createdAt;
        return created ? new Date(created) >= cutoff : false;
      });
    } else if (activeCategory === 'Rising Costs') {
      const half = Math.floor(dateRange.days / 2);
      const cutoffCurrent = new Date(); cutoffCurrent.setDate(cutoffCurrent.getDate() - half);
      const cutoffPrev = new Date(); cutoffPrev.setDate(cutoffPrev.getDate() - dateRange.days);
      list = list.filter(v => {
        const curSpend = transactions.filter(t => txVendorId(t) === v.id && new Date(t.date) >= cutoffCurrent).reduce((sum, t) => sum + t.total, 0);
        const prevSpend = transactions.filter(t => txVendorId(t) === v.id && new Date(t.date) >= cutoffPrev && new Date(t.date) < cutoffCurrent).reduce((sum, t) => sum + t.total, 0);
        return curSpend > prevSpend;
      });
    } else if (activeCategory === 'Needs Review') {
      const openVendorIds = new Set(recentTx.filter(t => t.status === 'OPEN').map(txVendorId));
      list = list.filter(v => openVendorIds.has(v.id));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.companyName?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.vendorType?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [vendors, transactions, recentTx, activeCategory, searchQuery, showInactive, dateRange.days]);

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

  const handleMakeInactive = async (id: string, currentlyActive: boolean) => {
    try {
      const { makeVendorInactive } = await import('../services/api');
      await makeVendorInactive(id, !currentlyActive);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to update vendor status');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `WARNING: Deleting ${selectedIds.length} vendors will permanently remove all associated transactions and cannot be undone.\n\nAre you sure you want to proceed?`
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

  const handleExportCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Type', 'Balance', '1099 Eligible', 'Active'];
    const rows = filteredVendors.map(v => [
      v.name, v.companyName || '', v.email || '', v.phone || '',
      v.vendorType || '', v.balance || 0,
      v.eligibleFor1099 ? 'Yes' : 'No',
      v.isActive !== false ? 'Active' : 'Inactive'
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vendors.csv'; a.click();
    URL.revokeObjectURL(url);
    setShowMenuOpen(false);
  };

  const dateOptions = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 60 Days', days: 60 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 365 Days', days: 365 },
  ];

  const dateLabel = dateOptions.find(d => d.days === dateRange.days)?.label || `Last ${dateRange.days} Days`;
  const dateFrom = new Date(); dateFrom.setDate(dateFrom.getDate() - dateRange.days);
  const dateTo = new Date();

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">{activeCategory}</h2>

              {/* Date Range Picker */}
              <div className="relative" ref={dateRef}>
                <button
                  onClick={() => setShowDatePicker(p => !p)}
                  className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="mr-2">📅</span>
                  {dateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {dateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  <span className="ml-2 text-gray-400">▼</span>
                </button>
                {showDatePicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-48 py-1">
                    {dateOptions.map(opt => (
                      <button
                        key={opt.days}
                        onClick={() => { setDateRange({ days: opt.days }); setShowDatePicker(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${dateRange.days === opt.days ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Three-dots Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenuOpen(p => !p)}
                  className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  title="More options"
                >
                  <span className="text-sm font-bold">⋮</span>
                </button>
                {showMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-52 py-1">
                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Export to CSV</button>
                    <button onClick={() => { onOpenWindow('VENDOR_BALANCE', 'Vendor Balance Summary'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Vendor Balance Summary</button>
                    <button onClick={() => { onOpenWindow('VENDOR_BALANCE_DETAIL', 'Vendor Balance Detail'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Vendor Balance Detail</button>
                    <button onClick={() => { onOpenWindow('UNPAID_BILLS_DETAIL', 'Unpaid Bills Detail'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Unpaid Bills Detail</button>
                    <button onClick={() => { onOpenWindow('AP_AGING', 'AP Aging Summary'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Vendor Aging Summary</button>
                    <button onClick={() => { onOpenWindow('AP_AGING_DETAIL', 'AP Aging Detail'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Vendor Aging Detail</button>
                    <button onClick={() => { onOpenWindow('PURCHASES_BY_VENDOR_DETAIL', 'Purchases by Vendor'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Purchases by Vendor</button>
                    <button onClick={() => { onOpenWindow('VENDOR_CONTACT_LIST', 'Vendor Contact List'); setShowMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700">Vendor Contact List</button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => { setShowInactive(p => !p); setShowMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    >
                      {showInactive ? 'Show Active Vendors' : 'Show Inactive Vendors'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search + Active/Inactive toggle */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-64"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                )}
              </div>
              <button
                onClick={() => setShowInactive(p => !p)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${showInactive ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                title={showInactive ? 'Currently showing inactive vendors' : 'Currently showing active vendors'}
              >
                {showInactive ? 'Inactive' : 'Active'}
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-3 mb-6 flex-wrap">
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
            <button onClick={onOpenReceive} className="flex-1 max-w-[150px] bg-white border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Receive Items
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

          {/* Result count */}
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
            <span>{filteredVendors.length} {showInactive ? 'inactive' : 'active'} vendor{filteredVendors.length !== 1 ? 's' : ''}</span>
            {searchQuery && <span className="text-blue-500">· filtered by "{searchQuery}"</span>}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <VendorTable
            vendors={filteredVendors}
            transactions={transactions}
            selectedVendorId={selectedVendorId}
            onSelectVendor={setSelectedVendorId}
            onOpenDetail={(vendor) => onOpenWindow('VENDOR_DETAIL', vendor.name, { vendorId: vendor.id })}
            onDeleteVendor={handleDeleteVendor}
            onMakeInactive={handleMakeInactive}
            onEditVendor={(vendor) => onOpenForm(vendor)}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorCenter;
