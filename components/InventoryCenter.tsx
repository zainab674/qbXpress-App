import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Item, Transaction, ViewState, Warehouse, Bin } from '../types';
import { fetchAvailableLots, fetchWarehouses, fetchBins, deleteItem, assignLot, reconcileUntrackedLot, deleteLot, createSerialNumbers, fetchSerialNumbers } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lot {
    _id: string;
    lotNumber: string;
    quantityReceived: number;
    quantityRemaining: number;
    dateReceived: string;
    expirationDate?: string;
    unitCost?: number;
    totalCost?: number;
    lotStatus?: 'available' | 'on-hold' | 'expired' | 'quarantine' | 'consumed';
    warehouseId?: string;
    binId?: string;
    binLocation?: string;
    vendorName?: string;
    notes?: string;
}

interface InventoryCenterProps {
    items: Item[];
    transactions: Transaction[];
    onUpdateItems: (items: Item[]) => void;
    onOpenForm: (item?: Item) => void;
    onOpenAdjustment?: () => void;
    onOpenBuild?: () => void;
    onOpenPO?: () => void;
    onOpenReceive?: () => void;
    onOpenWindow: (type: ViewState, title: string, params?: any) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 2) =>
    n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCurrency = (n: number) =>
    n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const lotStatusColor: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    'on-hold': 'bg-yellow-100 text-yellow-700',
    expired: 'bg-red-100 text-red-700',
    quarantine: 'bg-orange-100 text-orange-700',
    consumed: 'bg-gray-100 text-gray-500',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TabButton: React.FC<{ active: boolean; label: string; count?: number; onClick: () => void }> = ({ active, label, count, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
            ${active ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
    >
        {label}{count !== undefined && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{count}</span>}
    </button>
);

const DropdownMenu: React.FC<{ label: string; items: { label: string; onClick: () => void; divider?: boolean }[] }> = ({ label, items }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
                {label} <span className="text-[10px]">▼</span>
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[200px] py-1">
                    {items.map((item, i) => item.divider
                        ? <div key={i} className="border-t border-gray-100 my-1" />
                        : (
                            <button key={i} onClick={() => { item.onClick(); setOpen(false); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                                {item.label}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type ItemTab = 'All' | 'Inventory' | 'Assembly' | 'Services' | 'NonInventory' | 'Other';

const InventoryCenter: React.FC<InventoryCenterProps> = ({
    items,
    transactions,
    onUpdateItems,
    onOpenForm,
    onOpenAdjustment,
    onOpenBuild,
    onOpenPO,
    onOpenReceive,
    onOpenWindow
}) => {
    const [activeTab, setActiveTab] = useState<ItemTab>('Inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLots, setExpandedLots] = useState<Record<string, Lot[]>>({});
    const [loadingLots, setLoadingLots] = useState<Record<string, boolean>>({});
    const [assignLotModal, setAssignLotModal] = useState<{ itemId: string; itemName: string } | null>(null);
    const [assignLotForm, setAssignLotForm] = useState({ lotNumber: '', quantity: '', unitCost: '', salesPrice: '', expirationDate: '', notes: '' });
    const [assignLotSaving, setAssignLotSaving] = useState(false);
    const [assignLotError, setAssignLotError] = useState<string | null>(null);
    const [addSerialModal, setAddSerialModal] = useState<{ itemId: string; itemName: string } | null>(null);
    const [addSerialForm, setAddSerialForm] = useState({ serialNumbers: '', unitCost: '', notes: '' });
    const [addSerialSaving, setAddSerialSaving] = useState(false);
    const [addSerialError, setAddSerialError] = useState<string | null>(null);
    const [sortCol, setSortCol] = useState<string>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showInactive, setShowInactive] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // ── Warehouse + Bin lookup maps ──────────────────────────────────────────
    const [warehouseMap, setWarehouseMap] = useState<Record<string, string>>({});
    const [binMap, setBinMap] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchWarehouses()
            .then((whs: Warehouse[]) => {
                const m: Record<string, string> = { DEFAULT: 'Default Warehouse' };
                whs.forEach(w => { m[w.id] = w.name; });
                setWarehouseMap(m);
            })
            .catch(() => { });
        fetchBins()
            .then((bins: Bin[]) => {
                const m: Record<string, string> = {};
                bins.forEach(b => { m[b.id] = b.name; });
                setBinMap(m);
            })
            .catch(() => { });
    }, []);

    // ── Delete / Inactive ───────────────────────────────────────────────────
    const handleDelete = async (item: Item) => {
        if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
        try {
            await deleteItem(item.id);
            onUpdateItems(items.filter(i => i.id !== item.id));
        } catch (err: any) {
            alert(err.message || 'Failed to delete item');
        }
    };

    const handleToggleInactive = (item: Item) => {
        onUpdateItems(items.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    };

    // ── Lot toggle ──────────────────────────────────────────────────────────
    const toggleLots = async (itemId: string) => {
        if (expandedLots[itemId]) {
            setExpandedLots(prev => { const u = { ...prev }; delete u[itemId]; return u; });
            return;
        }
        setLoadingLots(prev => ({ ...prev, [itemId]: true }));
        try {
            const lots = await fetchAvailableLots(itemId);
            setExpandedLots(prev => ({ ...prev, [itemId]: lots }));
        } catch { /* silent */ } finally {
            setLoadingLots(prev => ({ ...prev, [itemId]: false }));
        }
    };

    const handleAddSerials = async () => {
        if (!addSerialModal) return;
        setAddSerialError(null);
        const lines = addSerialForm.serialNumbers.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length === 0) { setAddSerialError('Enter at least one serial number.'); return; }
        setAddSerialSaving(true);
        try {
            await createSerialNumbers(addSerialModal.itemId, {
                serialNumbers: lines,
                ...(addSerialForm.unitCost ? { unitCost: parseFloat(addSerialForm.unitCost) } : {}),
                ...(addSerialForm.notes ? { notes: addSerialForm.notes } : {}),
                dateReceived: new Date().toISOString().slice(0, 10),
            });
            setAddSerialModal(null);
            setAddSerialForm({ serialNumbers: '', unitCost: '', notes: '' });
        } catch (err: any) {
            setAddSerialError(err?.message || 'Failed to add serial numbers.');
        } finally {
            setAddSerialSaving(false);
        }
    };

    const handleAssignLot = async () => {
        if (!assignLotModal) return;
        setAssignLotError(null);
        if (!assignLotForm.lotNumber.trim()) { setAssignLotError('Lot number is required.'); return; }
        const qty = parseFloat(assignLotForm.quantity);
        if (!qty || qty <= 0) { setAssignLotError('Quantity must be greater than 0.'); return; }
        setAssignLotSaving(true);
        try {
            await assignLot(assignLotModal.itemId, {
                lotNumber: assignLotForm.lotNumber.trim(),
                quantity: qty,
                ...(assignLotForm.unitCost ? { unitCost: parseFloat(assignLotForm.unitCost) } : {}),
                ...(assignLotForm.salesPrice ? { salesPrice: parseFloat(assignLotForm.salesPrice) } : {}),
                ...(assignLotForm.expirationDate ? { expirationDate: assignLotForm.expirationDate } : {}),
                ...(assignLotForm.notes ? { notes: assignLotForm.notes } : {}),
            });
            // Refresh lots panel if open
            const lots = await fetchAvailableLots(assignLotModal.itemId);
            setExpandedLots(prev => ({ ...prev, [assignLotModal.itemId]: lots }));
            setAssignLotModal(null);
            setAssignLotForm({ lotNumber: '', quantity: '', unitCost: '', salesPrice: '', expirationDate: '', notes: '' });
        } catch (err: any) {
            setAssignLotError(err?.message || 'Failed to assign lot.');
        } finally {
            setAssignLotSaving(false);
        }
    };

    const handleReconcileUntracked = async (itemId: string) => {
        try {
            const result: any = await reconcileUntrackedLot(itemId);
            const lots = await fetchAvailableLots(itemId);
            setExpandedLots(prev => ({ ...prev, [itemId]: lots }));
            if (result.message === 'No reconciliation needed') {
                alert('No conflict found — lot quantities already match on-hand.');
            } else {
                alert(`Fixed: UNTRACKED adjusted from ${result.untrackedBefore} → ${result.untrackedAfter} units.`);
            }
        } catch (err: any) {
            alert(err?.message || 'Reconcile failed.');
        }
    };

    // ── Item filtering by tab ──────────────────────────────────────────────
    const tabItems = useMemo(() => {
        const activeItems = showInactive ? items : items.filter(i => i.isActive !== false);
        switch (activeTab) {
            case 'Inventory': return activeItems.filter(i => i.type === 'Inventory Part');
            case 'Assembly': return activeItems.filter(i => i.type === 'Inventory Assembly');
            case 'Services': return activeItems.filter(i => i.type === 'Service');
            case 'NonInventory': return activeItems.filter(i => i.type === 'Non-inventory Part');
            case 'Other': return activeItems.filter(i => ['Other Charge', 'Subtotal', 'Group', 'Discount', 'Payment'].includes(i.type));
            default: return activeItems;
        }
    }, [activeTab, items, showInactive]);

    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [items]);

    // ── Search + filter ────────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        let result = tabItems;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(q) ||
                (i.sku && i.sku.toLowerCase().includes(q)) ||
                (i.description && i.description.toLowerCase().includes(q)) ||
                ((i as any).manufacturerPartNumber && (i as any).manufacturerPartNumber.toLowerCase().includes(q))
            );
        }
        if (categoryFilter) result = result.filter(i => i.category === categoryFilter);
        if (lowStockOnly) result = result.filter(i => (i.onHand || 0) <= (i.reorderPoint || 0));
        return result;
    }, [tabItems, searchTerm, categoryFilter, lowStockOnly]);

    // ── Sort ───────────────────────────────────────────────────────────────
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            let av: any, bv: any;
            switch (sortCol) {
                case 'name': av = a.name; bv = b.name; break;
                case 'onHand': av = a.onHand || 0; bv = b.onHand || 0; break;
                case 'cost': {
                    const getCost = (i: any) => i.type === 'Inventory Assembly' ? (i.bomCost || i.averageCost || i.cost || 0) : (i.averageCost || i.cost || 0);
                    av = getCost(a); bv = getCost(b); break;
                }
                case 'price': av = a.salesPrice || 0; bv = b.salesPrice || 0; break;
                case 'value': {
                    const getCost = (i: any) => i.type === 'Inventory Assembly' ? (i.bomCost || i.averageCost || i.cost || 0) : (i.averageCost || i.cost || 0);
                    av = (a.onHand || 0) * getCost(a); bv = (b.onHand || 0) * getCost(b); break;
                }
                case 'reorder': av = a.reorderPoint || 0; bv = b.reorderPoint || 0; break;
                default: av = a.name; bv = b.name;
            }
            const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredItems, sortCol, sortDir]);

    const toggleSort = (col: string) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    // ── Quantities from transactions ───────────────────────────────────────
    const { poQtyMap, soQtyMap } = useMemo(() => {
        const poQtyMap: Record<string, number> = {};
        const soQtyMap: Record<string, number> = {};
        transactions.forEach(tx => {
            if (tx.status === 'CLOSED' || tx.status === 'Closed' || tx.status === 'PAID') return;
            if (tx.type === 'PURCHASE_ORDER') {
                tx.items.forEach(li => { if (li.itemId) poQtyMap[li.itemId] = (poQtyMap[li.itemId] || 0) + (li.quantity || 0); });
            } else if (tx.type === 'SALES_ORDER') {
                tx.items.forEach(li => { if (li.itemId) soQtyMap[li.itemId] = (soQtyMap[li.itemId] || 0) + (li.quantity || 0); });
            }
        });
        return { poQtyMap, soQtyMap };
    }, [transactions]);

    // ── Summary stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const invItems = items.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly');
        let totalValue = 0, lowStockCount = 0, outOfStockCount = 0;
        invItems.forEach(i => {
            const avgCost = i.type === 'Inventory Assembly'
                ? ((i as any).bomCost || (i as any).averageCost || i.cost || 0)
                : ((i as any).averageCost || i.cost || 0);
            totalValue += (i.onHand || 0) * avgCost;
            if ((i.onHand || 0) === 0) outOfStockCount++;
            else if ((i.onHand || 0) <= (i.reorderPoint || 0)) lowStockCount++;
        });
        return { totalValue, lowStockCount, outOfStockCount, totalItems: invItems.length };
    }, [items]);

    const tabCounts: Record<ItemTab, number> = useMemo(() => ({
        All: items.filter(i => showInactive || i.isActive !== false).length,
        Inventory: items.filter(i => i.type === 'Inventory Part' && (showInactive || i.isActive !== false)).length,
        Assembly: items.filter(i => i.type === 'Inventory Assembly' && (showInactive || i.isActive !== false)).length,
        Services: items.filter(i => i.type === 'Service' && (showInactive || i.isActive !== false)).length,
        NonInventory: items.filter(i => i.type === 'Non-inventory Part' && (showInactive || i.isActive !== false)).length,
        Other: items.filter(i => ['Other Charge', 'Subtotal', 'Group', 'Discount', 'Payment'].includes(i.type) && (showInactive || i.isActive !== false)).length,
    }), [items, showInactive]);

    // ── Column sort header ─────────────────────────────────────────────────
    const SortTh: React.FC<{ col: string; label: string; right?: boolean; className?: string }> = ({ col, label, right, className }) => (
        <th className={`px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none cursor-pointer hover:text-gray-800 ${right ? 'text-right' : ''} ${className || ''}`}
            onClick={() => toggleSort(col)}>
            <span className="flex items-center gap-0.5 justify-end">
                {right && <span className="text-[9px] opacity-50">{sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
                {label}
                {!right && <span className="text-[9px] opacity-50">{sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
            </span>
        </th>
    );

    const showInventoryColumns = activeTab === 'Inventory' || activeTab === 'Assembly' || activeTab === 'All';

    return (
        <>
            <div className="flex flex-col bg-white font-sans text-gray-800 min-h-full select-none">

                {/* ── Header ── */}
                <div className="px-5 pt-4 pb-0 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Item List</h1>
                            <p className="text-xs text-gray-500 mt-0.5">Manage inventory, services, and other items</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Activities Menu */}
                            <DropdownMenu label="Activities" items={[
                                { label: 'Receive Items (with Bill)', onClick: () => onOpenWindow('BILL', 'Bill') },
                                { label: 'Receive Items (without Bill)', onClick: () => onOpenReceive?.() },
                                { label: 'Enter Bills Against Inventory', onClick: () => onOpenWindow('BILL', 'Bill') },
                                { divider: true } as any,
                                { label: 'Enter Landed Costs', onClick: () => onOpenWindow('LANDED_COST', 'Enter Landed Costs') },
                                { divider: true } as any,
                                { label: 'Adjust Quantity/Value on Hand', onClick: () => onOpenAdjustment?.() },
                                { label: 'Build Assemblies', onClick: () => onOpenBuild?.() },
                                { divider: true } as any,
                                { label: 'Create Purchase Order', onClick: () => onOpenPO?.() },
                                { label: 'Physical Inventory Count', onClick: () => onOpenWindow('INVENTORY_COUNT' as any, 'Physical Inventory Count') },
                                { divider: true } as any,
                                { label: 'Manage Warehouses & Bins', onClick: () => onOpenWindow('WAREHOUSE_CENTER', 'Warehouse & Bin Manager') },
                                { divider: true } as any,
                                { label: 'Lot Traceability', onClick: () => onOpenWindow('LOT_TRACEABILITY', 'Lot Traceability') },
                                { label: 'QC / Lot Hold Management', onClick: () => onOpenWindow('LOT_QC_WORKFLOW', 'QC / Lot Hold Management') },
                            ]} />

                            {/* Reports Menu */}
                            <DropdownMenu label="Reports" items={[
                                { label: 'Inventory Valuation Summary', onClick: () => onOpenWindow('REPORT' as any, 'Inventory Valuation Summary', { reportType: 'inventory-valuation' }) },
                                { label: 'Inventory Valuation Detail', onClick: () => onOpenWindow('REPORT' as any, 'Inventory Valuation Detail', { reportType: 'inventory-valuation-detail' }) },
                                { divider: true } as any,
                                { label: 'Inventory Stock Status by Item', onClick: () => onOpenWindow('REPORT' as any, 'Stock Status by Item', { reportType: 'inventory-stock-status' }) },
                                { label: 'Inventory Stock Status by Vendor', onClick: () => onOpenWindow('REPORT' as any, 'Stock Status by Vendor', { reportType: 'inventory-stock-status-by-vendor' }) },
                                { divider: true } as any,
                                { label: 'Physical Inventory Worksheet', onClick: () => onOpenWindow('PHYSICAL_INVENTORY_WORKSHEET' as any, 'Physical Inventory Worksheet') },
                                { label: 'Pending Builds', onClick: () => onOpenWindow('REPORT' as any, 'Pending Builds', { reportType: 'pending-builds' }) },
                                { label: 'Inventory Turnover', onClick: () => onOpenWindow('REPORT' as any, 'Inventory Turnover', { reportType: 'inventory-turnover' }) },
                            ]} />

                            <div className="h-5 w-px bg-gray-300" />

                            <button
                                onClick={() => onOpenForm({ type: 'Inventory Part' } as any)}
                                className="px-4 py-1.5 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 transition-colors shadow-sm"
                            >
                                + New Item
                            </button>
                        </div>
                    </div>

                    {/* ── Summary Cards ── */}
                    <div className="flex gap-4 mb-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md shadow-sm">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-700 text-sm">📦</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Value</div>
                                <div className="text-sm font-bold text-gray-900">{fmtCurrency(stats.totalValue)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md shadow-sm">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-gray-700 text-sm">#</span>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inventory Items</div>
                                <div className="text-sm font-bold text-gray-900">{stats.totalItems}</div>
                            </div>
                        </div>
                        {stats.lowStockCount > 0 && (
                            <button
                                onClick={() => setLowStockOnly(v => !v)}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-md shadow-sm transition-colors ${lowStockOnly ? 'bg-orange-50 border-orange-400' : 'bg-white border-orange-200 hover:bg-orange-50'}`}
                            >
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-orange-700 font-bold text-sm">!</span>
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Low Stock</div>
                                    <div className="text-sm font-bold text-orange-700">{stats.lowStockCount} item{stats.lowStockCount !== 1 ? 's' : ''}</div>
                                </div>
                            </button>
                        )}
                        {stats.outOfStockCount > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-md shadow-sm">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-700 font-bold text-sm">0</span>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Out of Stock</div>
                                    <div className="text-sm font-bold text-red-700">{stats.outOfStockCount} item{stats.outOfStockCount !== 1 ? 's' : ''}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Tabs ── */}
                    <div className="flex items-end gap-0 overflow-x-auto">
                        {(['All', 'Inventory', 'Assembly', 'Services', 'NonInventory', 'Other'] as ItemTab[]).map(tab => (
                            <TabButton key={tab} active={activeTab === tab}
                                label={tab === 'NonInventory' ? 'Non-Inventory' : tab}
                                count={tabCounts[tab]}
                                onClick={() => setActiveTab(tab)} />
                        ))}
                    </div>
                </div>

                {/* ── Toolbar ── */}
                <div className="px-5 py-2.5 flex items-center justify-between border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name, SKU or description..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8 pr-4 py-1.5 border border-gray-300 rounded text-sm w-72 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Category filter */}
                        {categories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}

                        {lowStockOnly && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded flex items-center gap-1">
                                Low Stock Filter
                                <button onClick={() => setLowStockOnly(false)} className="ml-1 text-orange-500 hover:text-orange-800">✕</button>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
                                className="rounded border-gray-300 w-3.5 h-3.5 text-blue-600" />
                            <span>Show Inactive</span>
                        </label>
                        <span className="text-gray-300">|</span>
                        <span className="font-medium text-gray-600">{sortedItems.length} of {items.length} items</span>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2.5 w-8">
                                    <input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5" />
                                </th>
                                <th className="px-3 py-2.5 w-12"></th>
                                <SortTh col="name" label="Name / SKU" />
                                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                {showInventoryColumns && <>
                                    <SortTh col="onHand" label="On Hand" right />
                                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">On PO</th>
                                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">On SO</th>
                                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Avail</th>
                                    <SortTh col="reorder" label="Reorder Pt" right />
                                    <SortTh col="cost" label="Avg Cost" right />
                                </>}
                                <SortTh col="price" label="Sales Price" right />
                                {showInventoryColumns && <SortTh col="value" label="Asset Value" right />}
                                <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedItems.length === 0 && (
                                <tr>
                                    <td colSpan={15} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="text-4xl">📦</span>
                                            <p className="font-semibold">No items found</p>
                                            <p className="text-xs">{searchTerm ? 'Try a different search term' : 'Add your first item to get started'}</p>
                                            {!searchTerm && (
                                                <button onClick={() => onOpenForm({ type: 'Inventory Part' } as any)}
                                                    className="mt-2 px-4 py-1.5 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700">
                                                    + New Item
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {sortedItems.map(item => {
                                const avgCost = item.type === 'Inventory Assembly'
                                    ? ((item as any).bomCost || (item as any).averageCost || item.cost || 0)
                                    : ((item as any).averageCost || item.cost || 0);
                                const onHand = item.onHand || 0;
                                const poQty = poQtyMap[item.id] || 0;
                                const soQty = soQtyMap[item.id] || 0;
                                const available = onHand - soQty;
                                const reorderPt = item.reorderPoint || 0;
                                const isLow = onHand > 0 && onHand <= reorderPt;
                                const isOut = onHand <= 0 && (item.type === 'Inventory Part' || item.type === 'Inventory Assembly');
                                const assetValue = onHand * avgCost;
                                const isInventory = item.type === 'Inventory Part' || item.type === 'Inventory Assembly';
                                const isInactive = item.isActive === false;
                                const hasLots = (item as any).trackLots;
                                const lots = expandedLots[item.id];

                                return (
                                    <React.Fragment key={item.id}>
                                        <tr className={`hover:bg-blue-50/30 transition-colors group ${isInactive ? 'opacity-50' : ''} ${lots ? 'bg-blue-50/20' : ''}`}>
                                            <td className="px-3 py-3">
                                                <input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5" />
                                            </td>
                                            {/* Image / Icon */}
                                            <td className="px-2 py-3">
                                                <div className="w-9 h-9 border border-gray-200 rounded flex items-center justify-center bg-white overflow-hidden">
                                                    {item.imageUrl
                                                        ? <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                                                        : <span className="text-gray-300 text-lg">{item.type === 'Service' ? '⚙' : '📦'}</span>
                                                    }
                                                </div>
                                            </td>
                                            {/* Name + SKU + Lot toggle */}
                                            <td className="px-3 py-3 min-w-[160px]">
                                                <div className="flex flex-col">
                                                    {(item as any).parentId && (() => {
                                                        const parent = items.find(i => i.id === (item as any).parentId);
                                                        return (
                                                            <span className="text-[10px] text-gray-400 font-semibold mb-0.5">
                                                                └ <span className="text-gray-500">{parent ? parent.name : 'Sub-item'}</span>
                                                            </span>
                                                        );
                                                    })()}
                                                    <button onClick={() => onOpenForm(item)}
                                                        className={`text-sm font-semibold text-blue-700 hover:underline text-left leading-tight ${(item as any).parentId ? 'pl-3' : ''}`}>
                                                        {item.name}
                                                        {isInactive && <span className="ml-1 text-[10px] text-gray-400">(Inactive)</span>}
                                                    </button>
                                                    {item.sku && <span className={`text-[11px] text-gray-400 font-mono ${(item as any).parentId ? 'pl-3' : ''}`}>{item.sku}</span>}
                                                    {isInventory && (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <button onClick={() => toggleLots(item.id)}
                                                                className="text-[10px] text-gray-400 hover:text-blue-600 text-left flex items-center gap-0.5 font-semibold uppercase tracking-wider transition-colors">
                                                                {loadingLots[item.id] ? '...' : lots ? '▲ Hide Lots' : '▼ Lots'}
                                                            </button>
                                                            {(item as any).trackSerialNumbers && (
                                                                <button
                                                                    onClick={() => { setAddSerialModal({ itemId: item.id, itemName: item.name }); setAddSerialError(null); setAddSerialForm({ serialNumbers: '', unitCost: '', notes: '' }); }}
                                                                    className="text-[10px] text-teal-500 hover:text-teal-700 font-bold uppercase tracking-wider transition-colors"
                                                                >+ Add Serials</button>
                                                            )}
                                                            {(item as any).trackLots && (
                                                                <>
                                                                    <button
                                                                        onClick={() => { setAssignLotModal({ itemId: item.id, itemName: item.name }); setAssignLotError(null); setAssignLotForm({ lotNumber: '', quantity: '', unitCost: '', salesPrice: '', expirationDate: '', notes: '' }); }}
                                                                        className="text-[10px] text-purple-500 hover:text-purple-700 font-bold uppercase tracking-wider transition-colors"
                                                                    >+ Assign Lot</button>

                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Description */}
                                            <td className="px-3 py-3 max-w-[180px]">
                                                <span className="text-xs text-gray-500 line-clamp-2">{item.description || '—'}</span>
                                            </td>
                                            {/* Type badge */}
                                            <td className="px-3 py-3">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
                                                    {item.type}
                                                </span>
                                            </td>

                                            {/* Inventory columns */}
                                            {showInventoryColumns && <>
                                                {/* On Hand */}
                                                <td className="px-3 py-3 text-right">
                                                    {isInventory
                                                        ? <div className="flex items-center justify-end gap-1.5">
                                                            <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                                                                {fmt(onHand, 0)}
                                                            </span>
                                                            {isOut && <span className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 rounded uppercase">Out</span>}
                                                            {isLow && !isOut && (
                                                                <span onClick={e => { e.stopPropagation(); onOpenPO?.(); }}
                                                                    className="bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded uppercase cursor-pointer hover:bg-orange-600">
                                                                    Low
                                                                </span>
                                                            )}
                                                        </div>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                {/* On PO */}
                                                <td className="px-3 py-3 text-right text-xs text-gray-600">{isInventory ? fmt(poQty, 0) : '—'}</td>
                                                {/* On SO */}
                                                <td className="px-3 py-3 text-right text-xs text-gray-600">{isInventory ? fmt(soQty, 0) : '—'}</td>
                                                {/* Available */}
                                                <td className="px-3 py-3 text-right">
                                                    {isInventory
                                                        ? <span className={`font-semibold text-xs ${available < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmt(available, 0)}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                {/* Reorder Pt */}
                                                <td className="px-3 py-3 text-right text-xs text-gray-500">{isInventory && reorderPt > 0 ? fmt(reorderPt, 0) : '—'}</td>
                                                {/* Avg Cost */}
                                                <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                                                    {isInventory ? fmtCurrency(avgCost) : '—'}
                                                </td>
                                            </>}

                                            {/* Sales Price */}
                                            <td className="px-3 py-3 text-right text-xs font-mono text-gray-900 font-semibold">
                                                {item.salesPrice != null ? fmtCurrency(item.salesPrice) : '—'}
                                            </td>

                                            {/* Asset Value */}
                                            {showInventoryColumns && (
                                                <td className="px-3 py-3 text-right text-xs font-mono font-bold text-gray-900">
                                                    {isInventory ? fmtCurrency(assetValue) : '—'}
                                                </td>
                                            )}

                                            {/* Actions */}
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onOpenForm(item)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 hover:bg-blue-50 rounded transition-colors">
                                                        Edit
                                                    </button>
                                                    {isInventory && (
                                                        <>
                                                            <button onClick={() => onOpenAdjustment?.()}
                                                                className="text-xs text-gray-500 hover:text-gray-800 px-2 py-0.5 hover:bg-gray-50 rounded transition-colors">
                                                                Adjust
                                                            </button>
                                                            {item.type === 'Inventory Assembly' && (
                                                                <button onClick={() => onOpenBuild?.()}
                                                                    className="text-xs text-purple-600 hover:text-purple-800 px-2 py-0.5 hover:bg-purple-50 rounded transition-colors">
                                                                    Build
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    <button onClick={() => handleToggleInactive(item)}
                                                        className="text-xs text-yellow-600 hover:text-yellow-800 px-2 py-0.5 hover:bg-yellow-50 rounded transition-colors">
                                                        {item.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button onClick={() => handleDelete(item)}
                                                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 hover:bg-red-50 rounded transition-colors">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* ── Lot Details Panel ── */}
                                        {lots && (
                                            <tr className="bg-slate-50">
                                                <td colSpan={showInventoryColumns ? 14 : 10} className="px-6 py-3">
                                                    <div className="ml-8">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                                            Lot / Batch Tracking — {lots.length} lot{lots.length !== 1 ? 's' : ''}
                                                        </div>
                                                        {lots.length === 0
                                                            ? <p className="text-xs text-gray-400 italic">No active lots found for this item.</p>
                                                            : (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                    {lots.map(lot => {
                                                                        const pct = lot.quantityReceived > 0 ? (lot.quantityRemaining / lot.quantityReceived) * 100 : 0;
                                                                        const isExpiringSoon = lot.expirationDate && new Date(lot.expirationDate) <= new Date(Date.now() + 30 * 86400000);
                                                                        const isExpired = lot.expirationDate && new Date(lot.expirationDate) < new Date();
                                                                        return (
                                                                            <div key={lot._id || lot.lotNumber}
                                                                                className={`border rounded p-2.5 bg-white text-xs flex flex-col gap-1 shadow-sm ${isExpired ? 'border-red-200' : isExpiringSoon ? 'border-yellow-300' : 'border-gray-200'}`}>
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-bold text-gray-800 font-mono">{lot.lotNumber}</span>
                                                                                    {lot.lotStatus && (
                                                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${lotStatusColor[lot.lotStatus] || 'bg-gray-100 text-gray-500'}`}>
                                                                                            {lot.lotStatus}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex justify-between text-gray-500">
                                                                                    <span>Recd: {new Date(lot.dateReceived).toLocaleDateString()}</span>
                                                                                    {lot.expirationDate && (
                                                                                        <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-yellow-700' : ''}>
                                                                                            Exp: {new Date(lot.expirationDate).toLocaleDateString()}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex justify-between items-end">
                                                                                    <span className="font-bold text-gray-900">
                                                                                        {fmt(lot.quantityRemaining, 0)}
                                                                                        <span className="text-gray-400 font-normal"> / {fmt(lot.quantityReceived, 0)}</span>
                                                                                    </span>
                                                                                    {lot.unitCost != null && (
                                                                                        <span className="text-gray-500 font-mono">{fmtCurrency(lot.unitCost)}/unit</span>
                                                                                    )}
                                                                                    {(lot as any).salesPrice != null && (
                                                                                        <span className="text-purple-600 font-mono font-bold">{fmtCurrency((lot as any).salesPrice)} sale</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="w-full h-1 bg-gray-100 rounded overflow-hidden">
                                                                                    <div className="h-full bg-blue-400 rounded transition-all"
                                                                                        style={{ width: `${pct}%` }} />
                                                                                </div>
                                                                                {(lot.warehouseId && lot.warehouseId !== 'DEFAULT') || lot.binId || lot.binLocation ? (
                                                                                    <span className="text-gray-400 text-[10px]">
                                                                                        📍 {warehouseMap[lot.warehouseId || ''] || lot.warehouseId || 'Default'}
                                                                                        {(lot.binId || lot.binLocation) && (
                                                                                            <span className="ml-1 px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded font-semibold">
                                                                                                {lot.binId ? (binMap[lot.binId] || lot.binId) : lot.binLocation}
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                ) : null}
                                                                                {lot.vendorName && <span className="text-gray-400 truncate">Vendor: {lot.vendorName}</span>}
                                                                                <div className="flex gap-1 pt-0.5 items-center justify-between">
                                                                                    <div className="flex gap-1 items-center">
                                                                                        <button
                                                                                            onClick={() => onOpenWindow('LOT_TRACEABILITY', `Lot Trace — ${lot.lotNumber}`, { lotNumber: lot.lotNumber })}
                                                                                            className="text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 hover:underline"
                                                                                        >← → Trace</button>
                                                                                        {(lot.lotStatus === 'available' || !lot.lotStatus) && (
                                                                                            <button
                                                                                                onClick={() => onOpenWindow('LOT_QC_WORKFLOW', 'QC / Lot Hold Management')}
                                                                                                className="text-[9px] font-black uppercase text-orange-600 hover:text-orange-800 hover:underline ml-2"
                                                                                            >Hold/QC</button>
                                                                                        )}
                                                                                        {(lot.lotStatus === 'on-hold' || lot.lotStatus === 'quarantine') && (
                                                                                            <button
                                                                                                onClick={() => onOpenWindow('LOT_QC_WORKFLOW', 'QC / Lot Hold Management')}
                                                                                                className="text-[9px] font-black uppercase text-green-600 hover:text-green-800 hover:underline ml-2"
                                                                                            >Release</button>
                                                                                        )}
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            if (!confirm(`Delete lot "${lot.lotNumber}"? This will remove ${lot.quantityRemaining} unit(s) from inventory.`)) return;
                                                                                            try {
                                                                                                await deleteLot(lot._id);
                                                                                                const updated = await fetchAvailableLots(item.id);
                                                                                                setExpandedLots(prev => ({ ...prev, [item.id]: updated }));
                                                                                            } catch (err: any) {
                                                                                                alert(err?.message || 'Failed to delete lot.');
                                                                                            }
                                                                                        }}
                                                                                        className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors"
                                                                                        title="Delete this lot"
                                                                                    >✕ Delete</button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>

                        {/* ── Footer totals ── */}
                        {sortedItems.length > 0 && showInventoryColumns && (
                            <tfoot className="border-t-2 border-gray-300 bg-gray-50 sticky bottom-0">
                                <tr className="text-xs font-bold text-gray-700">
                                    <td colSpan={5} className="px-3 py-2 text-gray-500">
                                        Totals ({sortedItems.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly').length} inventory items)
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {fmt(sortedItems.reduce((s, i) => (i.type === 'Inventory Part' || i.type === 'Inventory Assembly') ? s + (i.onHand || 0) : s, 0), 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {fmt(sortedItems.reduce((s, i) => s + (poQtyMap[i.id] || 0), 0), 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {fmt(sortedItems.reduce((s, i) => s + (soQtyMap[i.id] || 0), 0), 0)}
                                    </td>
                                    <td colSpan={3} />
                                    <td className="px-3 py-2 text-right" />
                                    <td className="px-3 py-2 text-right font-mono text-blue-800">
                                        {fmtCurrency(sortedItems.reduce((s, i) => {
                                            if (i.type !== 'Inventory Part' && i.type !== 'Inventory Assembly') return s;
                                            const c = i.type === 'Inventory Assembly'
                                                ? ((i as any).bomCost || (i as any).averageCost || i.cost || 0)
                                                : ((i as any).averageCost || i.cost || 0);
                                            return s + (i.onHand || 0) * c;
                                        }, 0))}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Add Serials Modal ── */}
            {addSerialModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-2xl w-[420px] p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-800">Add Serials — <span className="text-teal-700">{addSerialModal.itemName}</span></h3>
                            <button onClick={() => setAddSerialModal(null)} className="text-gray-400 hover:text-gray-700 font-bold text-lg leading-none">✕</button>
                        </div>

                        {addSerialError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{addSerialError}</p>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Serial Numbers * <span className="normal-case font-normal text-gray-400">(one per line)</span></label>
                            <textarea
                                rows={5}
                                className="border p-1.5 text-xs outline-none font-mono focus:ring-1 ring-teal-400 resize-none"
                                placeholder={"SN-0001\nSN-0002\nSN-0003"}
                                value={addSerialForm.serialNumbers}
                                onChange={e => setAddSerialForm(f => ({ ...f, serialNumbers: e.target.value }))}
                            />
                            <span className="text-[10px] text-gray-400">{addSerialForm.serialNumbers.split('\n').filter(s => s.trim()).length} serial(s) entered</span>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Unit Cost</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    className="border p-1.5 text-xs outline-none focus:ring-1 ring-teal-400"
                                    placeholder="Optional"
                                    value={addSerialForm.unitCost}
                                    onChange={e => setAddSerialForm(f => ({ ...f, unitCost: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Notes</label>
                                <input
                                    type="text"
                                    className="border p-1.5 text-xs outline-none focus:ring-1 ring-teal-400"
                                    placeholder="Optional"
                                    value={addSerialForm.notes}
                                    onChange={e => setAddSerialForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleAddSerials}
                                disabled={addSerialSaving}
                                className="flex-1 bg-teal-600 text-white text-xs font-bold py-1.5 rounded hover:bg-teal-700 disabled:opacity-50"
                            >
                                {addSerialSaving ? 'Saving…' : 'Add Serials'}
                            </button>
                            <button
                                onClick={() => setAddSerialModal(null)}
                                disabled={addSerialSaving}
                                className="flex-1 border border-gray-300 text-xs font-bold py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
                            >Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Lot Modal ── */}
            {assignLotModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-2xl w-[95vw] h-[95vh] overflow-y-auto p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-800">Assign Lot — <span className="text-purple-700">{assignLotModal.itemName}</span></h3>
                            <button onClick={() => setAssignLotModal(null)} className="text-gray-400 hover:text-gray-700 font-bold text-lg leading-none">✕</button>
                        </div>

                        {assignLotError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{assignLotError}</p>
                        )}

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Lot Number *</label>
                            <input
                                type="text"
                                className="border p-1.5 text-xs outline-none font-mono uppercase focus:ring-1 ring-purple-400"
                                placeholder="e.g. LOT-2026-001"
                                value={assignLotForm.lotNumber}
                                onChange={e => setAssignLotForm(f => ({ ...f, lotNumber: e.target.value }))}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Quantity *</label>
                            <input
                                type="number"
                                min="0.01"
                                step="any"
                                className="border p-1.5 text-xs outline-none focus:ring-1 ring-purple-400"
                                placeholder="0"
                                value={assignLotForm.quantity}
                                onChange={e => setAssignLotForm(f => ({ ...f, quantity: e.target.value }))}
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Unit Cost</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    className="border p-1.5 text-xs outline-none focus:ring-1 ring-purple-400"
                                    placeholder="Optional"
                                    value={assignLotForm.unitCost}
                                    onChange={e => setAssignLotForm(f => ({ ...f, unitCost: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Sales Price <span className="normal-case font-normal text-gray-400">(overrides default)</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    className="border p-1.5 text-xs outline-none focus:ring-1 ring-purple-400"
                                    placeholder="Optional"
                                    value={assignLotForm.salesPrice}
                                    onChange={e => setAssignLotForm(f => ({ ...f, salesPrice: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Expiry Date</label>
                                <input
                                    type="date"
                                    className="border p-1.5 text-xs outline-none focus:ring-1 ring-purple-400"
                                    value={assignLotForm.expirationDate}
                                    onChange={e => setAssignLotForm(f => ({ ...f, expirationDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Notes</label>
                            <input
                                type="text"
                                className="border p-1.5 text-xs outline-none focus:ring-1 ring-purple-400"
                                placeholder="Optional"
                                value={assignLotForm.notes}
                                onChange={e => setAssignLotForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleAssignLot}
                                disabled={assignLotSaving}
                                className="flex-1 bg-purple-600 text-white text-xs font-bold py-1.5 rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                                {assignLotSaving ? 'Saving…' : 'Assign Lot'}
                            </button>
                            <button
                                onClick={() => setAssignLotModal(null)}
                                disabled={assignLotSaving}
                                className="flex-1 border border-gray-300 text-xs font-bold py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InventoryCenter;
