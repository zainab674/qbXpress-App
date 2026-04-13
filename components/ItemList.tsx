
import React, { useState, useEffect } from 'react';
import { Item, Account, Warehouse } from '../types';
import { fetchWarehouses, fetchWarehouseInventorySnapshot, deleteItem } from '../services/api';

interface WarehouseSnapshot {
  itemId: string;
  byWarehouse: Record<string, { qty: number; warehouseName: string }>;
}

interface Props {
  items: Item[];
  accounts: Account[];
  onUpdateItems: (items: Item[]) => void;
  onOpenForm: (item?: Item) => void;
  onOpenReport: (type: any, title: string) => void;
  onOrderLowStock: () => void;
  showAlert: (msg: string, title?: string) => void;
}

const ItemList: React.FC<Props> = ({ items, accounts, onUpdateItems, onOpenForm, onOpenReport, onOrderLowStock, showAlert }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [snapshot, setSnapshot] = useState<WarehouseSnapshot[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWarehouses()
      .then((whs: Warehouse[]) => setWarehouses(whs))
      .catch(() => {/* no warehouses configured */});
    fetchWarehouseInventorySnapshot()
      .then((res: { warehouses: Warehouse[]; snapshot: WarehouseSnapshot[] }) => {
        setSnapshot(res.snapshot || []);
        if (res.warehouses?.length) setWarehouses(res.warehouses);
      })
      .catch(() => {/* ignore */});
  }, []);

  const displayedItems = items.filter(i => {
    if (!includeInactive && !i.isActive) return false;
    if (siteFilter !== 'ALL' && i.type === 'Inventory Part') {
      const snap = snapshot.find(s => s.itemId === i.id);
      if (snap) {
        const qty = snap.byWarehouse[siteFilter]?.qty ?? 0;
        if (qty === 0) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        (i as any).manufacturer?.toLowerCase().includes(q) ||
        (i as any).manufacturerPartNumber?.toLowerCase().includes(q) ||
        (i as any).barcode?.toLowerCase().includes(q) ||
        (i as any).vendorSKU?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '';

  const getWarehouseQty = (item: Item, warehouseId: string): number => {
    if (item.type !== 'Inventory Part') return 0;
    const snap = snapshot.find(s => s.itemId === item.id);
    return snap?.byWarehouse[warehouseId]?.qty ?? 0;
  };

  const toggleActive = (id: string) => {
    onUpdateItems(items.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i));
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteItem(id);
      onUpdateItems(items.filter(i => i.id !== id));
      setSelectedItemId(null);
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete item', 'Error');
    }
  };

  // Columns to show: all warehouses if ALL, or just the selected one
  const warehouseCols = siteFilter === 'ALL' ? warehouses : warehouses.filter(w => w.id === siteFilter);

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0] select-none">
      <div className="flex-1 overflow-auto bg-white m-1 border border-gray-400 qb-window-shadow">
        <table className="w-full text-[11px] text-left border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10 shadow-sm">
            <tr className="h-6">
              <th className="px-2 border-r border-gray-300 font-bold w-8 text-center uppercase">X</th>
              <th className="px-2 border-r border-gray-300 font-bold uppercase">Name</th>
              <th className="px-2 border-r border-gray-300 font-bold w-32 uppercase">Type</th>
              <th className="px-2 border-r border-gray-300 font-bold uppercase">Description</th>
              <th className="px-2 border-r border-gray-300 font-bold w-48 uppercase">Account</th>
              <th className="px-2 border-r border-gray-300 font-bold w-16 text-right uppercase">Total On Hand</th>
              {warehouseCols.map(w => (
                <th key={w.id} className="px-2 border-r border-gray-300 font-bold w-20 text-right uppercase whitespace-nowrap" title={w.name}>
                  {w.code || w.name.slice(0, 8)}
                </th>
              ))}
              <th className="px-2 font-bold w-24 text-right uppercase">Price</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map(item => {
              const isSelected = selectedItemId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  onDoubleClick={() => onOpenForm(item)}
                  className={`h-5 border-b border-gray-100 ${isSelected ? 'bg-[#003366] text-white' : 'hover:bg-blue-50'} ${!item.isActive ? 'italic text-gray-400' : ''}`}
                >
                  <td className="px-2 border-r border-gray-200 text-center font-bold" onClick={(e) => { e.stopPropagation(); toggleActive(item.id); }}>
                    {!item.isActive && 'X'}
                  </td>
                  <td className="px-2 border-r border-gray-200 font-bold truncate">
                    {item.parentId && <span className="text-gray-400 mr-2">└</span>}
                    {item.name}
                  </td>
                  <td className="px-2 border-r border-gray-200 italic">{item.type}</td>
                  <td className="px-2 border-r border-gray-200 truncate">{item.description}</td>
                  <td className="px-2 border-r border-gray-200 truncate">{getAccountName(item.incomeAccountId || item.cogsAccountId)}</td>
                  <td className="px-2 border-r border-gray-200 text-right">{item.onHand ?? ''}</td>
                  {warehouseCols.map(w => (
                    <td key={w.id} className="px-2 border-r border-gray-200 text-right font-mono">
                      {item.type === 'Inventory Part' ? (getWarehouseQty(item, w.id) || '') : ''}
                    </td>
                  ))}
                  <td className="px-2 text-right font-mono">
                    {item.type === 'Sales Tax Item' ? `${item.taxRate}%` : (item.salesPrice || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#f0f0f0] p-1 flex items-center justify-between border-t border-gray-300">
        <div className="flex gap-1 items-center">
          <div className="relative group">
            <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded flex items-center gap-2 shadow-sm">
              Item <span className="text-[8px]">▼</span>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] z-[5000] py-1 rounded-sm text-gray-900">
              <button onClick={() => onOpenForm()} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">New</button>
              <button onClick={() => { const it = items.find(i => i.id === selectedItemId); if (it) onOpenForm(it); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">Edit Item</button>
              <button onClick={() => selectedItemId && toggleActive(selectedItemId)} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">Make Item Inactive</button>
              <hr className="my-1 border-gray-200" />
              <button onClick={() => selectedItemId && handleDelete(selectedItemId)} className="w-full text-left px-4 py-1.5 hover:bg-red-600 hover:text-white text-xs text-red-600">Delete Item</button>
            </div>
          </div>
          {/* Search bar — name, SKU, description, mfr, barcode, vendor SKU */}
          <div className="flex items-center border border-gray-400 bg-white rounded-sm shadow-sm overflow-hidden">
            <span className="px-2 text-gray-400 text-[11px] select-none">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, SKU, barcode, mfr part#..."
              className="text-[11px] px-1 py-0.5 outline-none bg-transparent w-52"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-2 text-gray-400 hover:text-red-500 text-[11px] font-bold">✕</button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 px-2">
          {warehouses.length > 0 && (
            <div className="flex items-center gap-1">
              <label className="text-[11px] font-bold text-gray-700">Site:</label>
              <select
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value)}
                className="border border-gray-400 text-[11px] px-1 py-0.5 bg-white rounded-sm"
              >
                <option value="ALL">All Sites</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
            Include inactive
          </label>
        </div>
      </div>
    </div>
  );
};

export default ItemList;
