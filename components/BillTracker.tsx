
import React, { useState, useMemo } from 'react';
import { INITIAL_DATA } from '../store';
import { Transaction, Vendor } from '../types';

interface Props {
  transactions: Transaction[];
  vendors: Vendor[];
  onPayBill: (id: string) => void;
  onOpenBill: (id: string) => void;
  onConvertToBill?: (id: string) => void;
}

const BillTracker: React.FC<Props> = ({ transactions, vendors, onPayBill, onOpenBill, onConvertToBill }) => {
  const [filter, setFilter] = useState<'ALL' | 'UNBILLED' | 'UNPAID' | 'OVERDUE' | 'PAID'>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  const vendorsMap = useMemo(() => {
    const map: Record<string, Vendor> = {};
    vendors.forEach(v => map[v.id] = v);
    return map;
  }, [vendors]);

  const stats = useMemo(() => {
    const data = transactions.filter(t =>
      ['BILL', 'PURCHASE_ORDER', 'RECEIVE_ITEM'].includes(t.type)
    );

    return {
      unbilled: data.filter(t => t.type === 'PURCHASE_ORDER').reduce((acc, t) => acc + t.total, 0),
      unbilledCount: data.filter(t => t.type === 'PURCHASE_ORDER').length,
      unpaid: data.filter(t => t.type?.toUpperCase() === 'BILL' && t.status?.toUpperCase() !== 'PAID').reduce((acc, t) => acc + t.total, 0),
      unpaidCount: data.filter(t => t.type?.toUpperCase() === 'BILL' && t.status?.toUpperCase() !== 'PAID').length,
      overdue: data.filter(t => t.status?.toUpperCase() === 'OVERDUE').reduce((acc, t) => acc + t.total, 0),
      overdueCount: data.filter(t => t.status?.toUpperCase() === 'OVERDUE').length,
      paid: data.filter(t => t.status?.toUpperCase() === 'PAID').reduce((acc, t) => acc + t.total, 0),
      paidCount: data.filter(t => t.status?.toUpperCase() === 'PAID').length
    };
  }, [transactions]);

  const filterOptions = useMemo(() => {
    const uniqueVendors = Array.from(new Set(transactions.map(t => t.entityId)))
      .map(id => ({ id, name: vendorsMap[id]?.name || 'Unknown' }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const uniqueTypes = Array.from(new Set(transactions.map(t => t.type)));
    const uniqueStatuses = Array.from(new Set(transactions.map(t => t.status)));

    return {
      vendors: uniqueVendors,
      types: uniqueTypes,
      statuses: uniqueStatuses
    };
  }, [transactions, vendorsMap]);

  const isDateInRange = (dateStr: string, range: string) => {
    if (range === 'ALL') return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case 'TODAY':
        return date >= today;
      case 'THIS_WEEK': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return date >= weekAgo;
      }
      case 'THIS_MONTH':
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      case 'THIS_QUARTER': {
        const quarter = Math.floor(now.getMonth() / 3);
        const transQuarter = Math.floor(date.getMonth() / 3);
        return quarter === transQuarter && date.getFullYear() === now.getFullYear();
      }
      case 'THIS_YEAR':
        return date.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Basic type filter for Bill Tracker
      if (!['BILL', 'PURCHASE_ORDER', 'VENDOR_CREDIT', 'BILL_PAYMENT', 'RECEIVE_ITEM'].includes(t.type)) return false;

      // Top StatBox Filter (Primary)
      if (filter === 'UNBILLED' && t.type?.toUpperCase() !== 'PURCHASE_ORDER') return false;
      if (filter === 'UNPAID' && !(t.type?.toUpperCase() === 'BILL' && t.status?.toUpperCase() !== 'PAID')) return false;
      if (filter === 'OVERDUE' && t.status?.toUpperCase() !== 'OVERDUE') return false;
      if (filter === 'PAID' && t.status?.toUpperCase() !== 'PAID') return false;

      // Dropdown Filters (Refinement)
      if (vendorFilter !== 'ALL' && t.entityId !== vendorFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!isDateInRange(t.date, dateFilter)) return false;

      return true;
    });
  }, [transactions, filter, vendorFilter, typeFilter, statusFilter, dateFilter]);

  const StatBox = ({ label, sublabel, amount, color, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[200px] p-4 text-left border-b-8 transition-all ${active ? 'scale-105 shadow-md' : 'opacity-80 hover:opacity-100'} ${color}`}
    >
      <div className="text-[10px] font-bold uppercase opacity-80">{label}</div>
      <div className="text-xl font-bold mt-1">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      <div className="text-xs mt-1 font-semibold uppercase">{sublabel}</div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f4f4] overflow-hidden">
      {/* Dashboard Header */}
      <div className="flex p-4 gap-1 bg-gray-200 border-b border-gray-300">
        <StatBox
          label="Unbilled"
          sublabel={`${stats.unbilledCount} Purchase Orders`}
          amount={stats.unbilled}
          color="bg-[#2d7bbd] text-white border-blue-900"
          active={filter === 'UNBILLED'}
          onClick={() => setFilter(f => f === 'UNBILLED' ? 'ALL' : 'UNBILLED')}
        />
        <StatBox
          label="Unpaid"
          sublabel={`${stats.unpaidCount} Open Bills`}
          amount={stats.unpaid}
          color="bg-[#f2a541] text-white border-orange-700"
          active={filter === 'UNPAID'}
          onClick={() => setFilter(f => f === 'UNPAID' ? 'ALL' : 'UNPAID')}
        />
        <StatBox
          label="Overdue"
          sublabel={`${stats.overdueCount} Overdue`}
          amount={stats.overdue}
          color="bg-[#d9534f] text-white border-red-900"
          active={filter === 'OVERDUE'}
          onClick={() => setFilter(f => f === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
        />
        <StatBox
          label="Paid"
          sublabel={`${stats.paidCount} Paid in last 30 days`}
          amount={stats.paid}
          color="bg-[#5cb85c] text-white border-green-800"
          active={filter === 'PAID'}
          onClick={() => setFilter(f => f === 'PAID' ? 'ALL' : 'PAID')}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <span className="font-bold text-gray-500 uppercase">Vendor</span>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-500"
          >
            <option value="ALL">All</option>
            {filterOptions.vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-bold text-gray-500 uppercase">Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-500"
          >
            <option value="ALL">All types</option>
            {filterOptions.types.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-bold text-gray-500 uppercase">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-500"
          >
            <option value="ALL">All</option>
            {filterOptions.statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-bold text-gray-500 uppercase">Date</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-gray-50 outline-none focus:border-blue-500"
          >
            <option value="ALL">All</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="THIS_QUARTER">This Quarter</option>
            <option value="THIS_YEAR">This Year</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => {
            setFilter('ALL');
            setVendorFilter('ALL');
            setTypeFilter('ALL');
            setStatusFilter('ALL');
            setDateFilter('ALL');
          }}
          className="text-blue-600 font-bold hover:underline"
        >
          Clear / Show All
        </button>
      </div>

      {/* Transaction Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-300 shadow-sm z-10">
            <tr>
              <th className="px-4 py-2 border-r border-gray-200">Vendor</th>
              <th className="px-4 py-2 border-r border-gray-200">Type</th>
              <th className="px-4 py-2 border-r border-gray-200">Number</th>
              <th className="px-4 py-2 border-r border-gray-200">Date</th>
              <th className="px-4 py-2 border-r border-gray-200">Due Date</th>
              <th className="px-4 py-2 border-r border-gray-200">Status</th>
              <th className="px-4 py-2 border-r border-gray-200 text-right">Amount Due</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t, i) => (
              <tr key={t.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-blue-50 transition-colors`}>
                <td className="px-4 py-2 border-r font-semibold">{vendorsMap[t.entityId]?.name || 'Unknown'}</td>
                <td className="px-4 py-2 border-r text-gray-500">{t.type === 'RECEIVE_ITEM' ? 'Item Receipt' : t.type.replace('_', ' ')}</td>
                <td className="px-4 py-2 border-r">{t.refNo}</td>
                <td className="px-4 py-2 border-r">{t.date}</td>
                <td className="px-4 py-2 border-r">{t.dueDate || '--'}</td>
                <td className="px-4 py-2 border-r">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                    t.status === 'PAID' ? 'bg-green-100 text-green-700' :
                      t.status === 'UNBILLED' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                    }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2 border-r text-right font-mono">${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => {
                      if (t.type === 'BILL') onPayBill(t.id);
                      if ((t.type === 'PURCHASE_ORDER' || t.type === 'RECEIVE_ITEM') && onConvertToBill) onConvertToBill(t.id);
                    }}
                    className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-[10px] font-bold shadow-sm transition-all whitespace-nowrap"
                  >
                    {t.type === 'BILL' ? 'Pay Bill' : 'Convert to Bill'}
                  </button>
                  <button
                    onClick={() => onOpenBill(t.id)}
                    className="text-gray-400 font-bold border border-gray-300 px-2 py-0.5 rounded text-xs hover:bg-gray-100 transition-colors"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BillTracker;
