
import React, { useState } from 'react';
import { Item, Account } from '../types';

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

  const displayedItems = items.filter(i => includeInactive || i.isActive);

  const getAccountName = (id?: string) => accounts.find(a => a.id === id)?.name || '';

  const toggleActive = (id: string) => {
    onUpdateItems(items.map(i => i.id === id ? { ...i, isActive: !i.isActive } : i));
  };

  const handleAdjustInventory = () => {
    showAlert("The Inventory Adjustment module is used to sync physical counts. Please ensure all transactions are posted before proceeding.", "Inventory Management");
  };

  const handleInventoryReport = () => {
    onOpenReport('PHYSICAL_INVENTORY', 'Physical Inventory Worksheet');
  };

  const handleValuationReport = () => {
    onOpenReport('INV_VAL', 'Inventory Valuation Summary');
  };

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
              <th className="px-2 border-r border-gray-300 font-bold w-16 text-right uppercase">On Hand</th>
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
        <div className="flex gap-1">
          <div className="relative group">
            <button className="bg-gray-100 hover:bg-white border border-gray-400 px-3 py-0.5 text-[11px] font-bold rounded flex items-center gap-2 shadow-sm">
              Item <span className="text-[8px]">▼</span>
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-0 bg-white border border-gray-400 shadow-xl min-w-[150px] z-[5000] py-1 rounded-sm text-gray-900">
              <button onClick={() => onOpenForm()} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">New</button>
              <button onClick={() => { const it = items.find(i => i.id === selectedItemId); if (it) onOpenForm(it); }} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">Edit Item</button>
              <button onClick={() => selectedItemId && toggleActive(selectedItemId)} className="w-full text-left px-4 py-1.5 hover:bg-blue-600 hover:text-white text-xs">Make Item Inactive</button>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-4 px-2">
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
