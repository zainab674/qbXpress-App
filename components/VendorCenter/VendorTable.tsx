import React, { useState } from 'react';
import { Vendor, Transaction } from '../../types';

type SortKey = 'name' | 'balance' | 'transactions' | 'lastActivity' | 'vendorType';
type SortDir = 'asc' | 'desc';

interface VendorTableProps {
    vendors: Vendor[];
    transactions: Transaction[];
    onSelectVendor: (id: string) => void;
    selectedVendorId: string;
    onOpenDetail: (vendor: Vendor) => void;
    onDeleteVendor: (id: string) => void;
    onMakeInactive: (id: string, currentlyActive: boolean) => void;
    onEditVendor: (vendor: Vendor) => void;
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

const VendorTable: React.FC<VendorTableProps> = ({
    vendors, transactions, onSelectVendor, selectedVendorId,
    onOpenDetail, onDeleteVendor, onMakeInactive, onEditVendor,
    selectedIds, onSelectionChange
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ vendorId: string; x: number; y: number } | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const toggleSelectAll = () => {
        onSelectionChange(selectedIds.length === vendors.length ? [] : vendors.map(v => v.id));
    };

    const toggleSelect = (id: string) => {
        onSelectionChange(selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
    };

    const getVendorTransactions = (vendorId: string) =>
        transactions.filter(t => t.entityId === vendorId || t.vendorId === vendorId);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ col }: { col: SortKey }) => (
        <span className="ml-1 text-gray-300">
            {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
    );

    const txMap = React.useMemo(() => {
        const map: Record<string, Transaction[]> = {};
        vendors.forEach(v => { map[v.id] = getVendorTransactions(v.id); });
        return map;
    }, [vendors, transactions]);

    const sorted = React.useMemo(() => {
        return [...vendors].sort((a, b) => {
            let av: any, bv: any;
            if (sortKey === 'name') { av = a.name?.toLowerCase(); bv = b.name?.toLowerCase(); }
            else if (sortKey === 'balance') { av = a.balance || 0; bv = b.balance || 0; }
            else if (sortKey === 'transactions') { av = txMap[a.id]?.length || 0; bv = txMap[b.id]?.length || 0; }
            else if (sortKey === 'vendorType') { av = a.vendorType?.toLowerCase() || ''; bv = b.vendorType?.toLowerCase() || ''; }
            else if (sortKey === 'lastActivity') {
                const lastA = txMap[a.id]?.slice(-1)[0]?.date || '';
                const lastB = txMap[b.id]?.slice(-1)[0]?.date || '';
                av = lastA; bv = lastB;
            }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [vendors, sortKey, sortDir, txMap]);

    const handleContextMenu = (e: React.MouseEvent, vendorId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ vendorId, x: e.clientX, y: e.clientY });
    };

    // Close context menu on outside click
    React.useEffect(() => {
        if (!contextMenu) return;
        const handler = () => setContextMenu(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [contextMenu]);

    const ctxVendor = contextMenu ? vendors.find(v => v.id === contextMenu.vendorId) : null;

    return (
        <>
            {/* Context Menu */}
            {contextMenu && ctxVendor && (
                <div
                    style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-48"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => { onEditVendor(ctxVendor); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    >
                        ✏️ Edit Vendor
                    </button>
                    <button
                        onClick={() => { onOpenDetail(ctxVendor); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    >
                        👁 View Details
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                        onClick={() => { onMakeInactive(ctxVendor.id, ctxVendor.isActive !== false); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-amber-50 text-amber-700"
                    >
                        {ctxVendor.isActive !== false ? '🔕 Make Inactive' : '✅ Make Active'}
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                        onClick={() => { onDeleteVendor(ctxVendor.id); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600"
                    >
                        🗑️ Delete Vendor
                    </button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={vendors.length > 0 && selectedIds.length === vendors.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('name')}>
                                Vendor <SortIcon col="name" />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => handleSort('vendorType')}>
                                Type <SortIcon col="vendorType" />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                1099
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-gray-700" onClick={() => handleSort('balance')}>
                                Balance <SortIcon col="balance" />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center cursor-pointer hover:text-gray-700" onClick={() => handleSort('transactions')}>
                                Transactions <SortIcon col="transactions" />
                            </th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:text-gray-700" onClick={() => handleSort('lastActivity')}>
                                Last Activity <SortIcon col="lastActivity" />
                            </th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {sorted.map(vendor => {
                            const isExpanded = expandedId === vendor.id;
                            const isSelected = selectedIds.includes(vendor.id);
                            const vendorTx = txMap[vendor.id] || [];
                            const lastTransaction = vendorTx[vendorTx.length - 1];
                            const isInactive = vendor.isActive === false;

                            return (
                                <React.Fragment key={vendor.id}>
                                    <tr
                                        onClick={() => onSelectVendor(vendor.id)}
                                        onContextMenu={e => handleContextMenu(e, vendor.id)}
                                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${selectedVendorId === vendor.id ? 'bg-blue-50/30' : ''} ${isSelected ? 'bg-blue-50/60' : ''} ${isInactive ? 'opacity-60' : ''}`}
                                    >
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(vendor.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
                                                    {vendor.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span
                                                        onClick={e => { e.stopPropagation(); onOpenDetail(vendor); }}
                                                        className="font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {vendor.name}
                                                    </span>
                                                    {isInactive && (
                                                        <span className="ml-2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Inactive</span>
                                                    )}
                                                    {vendor.companyName && vendor.companyName !== vendor.name && (
                                                        <p className="text-xs text-gray-400">{vendor.companyName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {vendor.vendorType ? (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{vendor.vendorType}</span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {vendor.eligibleFor1099 ? (
                                                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">1099</span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${(vendor.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-500">
                                            {vendorTx.length}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500 text-sm">
                                            {lastTransaction?.date || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={e => { e.stopPropagation(); onEditVendor(vendor); }}
                                                    className="text-gray-400 hover:text-blue-600 p-1 transition-colors"
                                                    title="Edit Vendor"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); onDeleteVendor(vendor.id); }}
                                                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                    title="Delete Vendor"
                                                >
                                                    🗑️
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : vendor.id); }}
                                                    className="text-gray-400 hover:text-gray-600 p-1"
                                                    title="Toggle transactions"
                                                >
                                                    <span className={`transform transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={8} className="px-6 py-4">
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
                                                            {vendorTx.map(t => (
                                                                <tr key={t.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'BILL' ? 'bg-orange-100 text-orange-700' : t.type === 'PURCHASE_ORDER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                                            {t.type?.replace('_', ' ')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2 text-gray-900">{t.date}</td>
                                                                    <td className="px-4 py-2 text-right font-semibold text-gray-900">${t.total.toLocaleString()}</td>
                                                                    <td className="px-4 py-2 text-center">
                                                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${t.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                            {t.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <button
                                                                            onClick={() => onOpenDetail(vendor)}
                                                                            className="text-blue-600 hover:text-blue-800 text-xs hover:underline"
                                                                        >
                                                                            View detail
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {vendorTx.length === 0 && (
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
                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-16 text-center text-gray-400 italic">
                                    No vendors found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default VendorTable;
