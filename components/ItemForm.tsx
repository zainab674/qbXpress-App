
import React, { useState } from 'react';
import { Item, ItemType, Account, CustomFieldDefinition, Vendor } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  initialData?: Item;
  accounts: Account[];
  items: Item[];
  vendors: Vendor[];
  customFields: CustomFieldDefinition[];
}

const ItemForm: React.FC<Props> = ({ onClose, onSave, initialData, accounts, items, vendors, customFields }) => {
  const [formData, setFormData] = useState<Item>(initialData || {
    id: Math.random().toString(),
    name: '',
    type: 'Service',
    isActive: true,
    taxCode: 'Tax',
    unitOfMeasure: 'Each',
    customFieldValues: {},
    groupItems: [],
    taxGroupItems: [],
    printItemsInGroup: false,
    isSalesItem: true,
    isPurchaseItem: false,
  } as Item);

  const ITEM_TYPES: ItemType[] = ['Service', 'Inventory Part', 'Non-inventory Part', 'Other Charge', 'Subtotal', 'Group', 'Discount', 'Payment', 'Sales Tax Item', 'Sales Tax Group'];
  const incomeAccounts = accounts.filter(a => a.type === 'Income');
  const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold');
  const assetAccounts = accounts.filter(a => a.type === 'Other Current Asset' || a.type === 'Inventory' || a.type === 'Asset');

  const handleSave = (stayOpen = false) => {
    if (!formData.name.trim()) {
      alert("Item Name/Number is required.");
      return;
    }
    if (formData.isSalesItem && !formData.incomeAccountId) {
      alert("Income Account is required for sales items.");
      return;
    }
    if (formData.isPurchaseItem && !formData.cogsAccountId) {
      alert("Expense Account is required for purchase items.");
      return;
    }
    onSave(formData);
    if (!stayOpen) {
      onClose();
    } else {
      setFormData({
        id: Math.random().toString(),
        name: '',
        type: 'Service',
        isActive: true,
        taxCode: 'Tax',
        unitOfMeasure: 'Each',
        customFieldValues: {},
        groupItems: [],
        taxGroupItems: [],
        printItemsInGroup: false,
        isSalesItem: true,
        isPurchaseItem: false,
      } as Item);
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans overflow-hidden">
      {/* Premium Toolbar */}
      <div className="bg-white border-b border-gray-300 p-2 flex gap-4 shadow-sm items-center">
        <button onClick={() => handleSave(false)} className="flex flex-col items-center group">
          <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-[#0077c5] hover:bg-blue-50 transition-colors text-xl">💾</div>
          <span className="text-[10px] font-bold mt-1 uppercase text-gray-600">Save & Close</span>
        </button>
        <button onClick={() => handleSave(true)} className="flex flex-col items-center group">
          <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors text-xl">➕</div>
          <span className="text-[10px] font-bold mt-1 uppercase text-gray-600">Save & New</span>
        </button>
        <div className="w-px h-10 bg-gray-200 mx-2"></div>
        <button onClick={onClose} className="flex flex-col items-center group">
          <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✕</div>
          <span className="text-[10px] font-bold mt-1 uppercase text-gray-600">Cancel</span>
        </button>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 pr-4">
          <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {formData.isActive ? 'Active' : 'Inactive'}
          </label>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 accent-[#0077c5]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white m-4 rounded shadow-2xl border-2 border-gray-100 flex flex-col lg:flex-row divide-x-2 divide-gray-100">

        {/* Left Column: Basic Info & Identity */}
        <div className="w-full lg:w-1/2 p-8 space-y-8 bg-gradient-to-br from-white to-gray-50/30">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Item Number Creation</h2>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-900 to-transparent"></div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-lg">🏷️</span> Item Name / Number
                </label>
                <input
                  className="w-full border-b-2 border-blue-200 p-2 text-lg font-bold bg-transparent outline-none focus:border-blue-600 text-[#003366] transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name or number..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Type</label>
                <select
                  className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent font-black outline-none focus:border-blue-600 text-gray-700"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as ItemType })}
                >
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">SKU / Barcode</label>
                <input
                  className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                  value={formData.sku || ''}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Category</label>
                <input
                  className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                  value={formData.category || ''}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Physical Attributes</label>
              <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Weight</span>
                  <input type="number" className="w-full text-sm font-bold bg-transparent outline-none border-b border-gray-300 focus:border-blue-500" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })} placeholder="lbs" />
                </div>
                {['length', 'width', 'height'].map(dim => (
                  <div key={dim} className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">{dim}</span>
                    <input type="number" className="w-full text-sm font-bold bg-transparent outline-none border-b border-gray-300 focus:border-blue-500" value={(formData.dimensions as any)?.[dim] || ''} onChange={e => setFormData({ ...formData, dimensions: { ...(formData.dimensions || { unit: 'in' }), [dim]: parseFloat(e.target.value) || 0 } as any })} placeholder="in" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Image Preview</label>
              <div className="flex gap-4">
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Item" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <span className="text-3xl opacity-20">📷</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full border-2 border-gray-100 p-2 text-sm focus:border-blue-500 outline-none rounded bg-gray-50/50"
                    value={formData.imageUrl || ''}
                    placeholder="Paste image URL here..."
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Add a high-quality product photo for professional invoices and reports.</p>
                </div>
              </div>
            </div>
            {formData.type === 'Inventory Part' && (
              <div className="space-y-4 pt-4 border-t-2 border-orange-100 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest">Inventory Tracking</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Initial quantity on hand *</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-orange-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.onHand || ''}
                      onChange={e => setFormData({ ...formData, onHand: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">As of date *</label>
                    <input
                      type="date"
                      className="w-full border-b-2 border-orange-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.asOfDate || ''}
                      onChange={e => setFormData({ ...formData, asOfDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Reorder point</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.reorderPoint || ''}
                      onChange={e => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Inventory asset account *</label>
                    <select
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.assetAccountId || ''}
                      onChange={e => setFormData({ ...formData, assetAccountId: e.target.value })}
                    >
                      <option value="">Select Asset Account...</option>
                      {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financial Configuration */}
        <div className="w-full lg:w-1/2 p-8 space-y-8 bg-white">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-black text-gray-200 uppercase tracking-tighter">Accounting & Sales</h2>
            <div className="h-0.5 flex-1 bg-gray-100"></div>
          </div>

          <div className="flex flex-col gap-8">
            {/* Sales Information */}
            <div className={`p-6 rounded-xl border-2 transition-all ${formData.isSalesItem ? 'border-blue-100 bg-blue-50/20 shadow-lg ring-1 ring-blue-100' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isSalesPage"
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    checked={formData.isSalesItem}
                    onChange={e => setFormData({ ...formData, isSalesItem: e.target.checked })}
                  />
                  <label htmlFor="isSalesPage" className="text-base font-black text-[#003366] cursor-pointer tracking-tight">I sell this item</label>
                </div>
                <span className="text-2xl">💰</span>
              </div>

              {formData.isSalesItem && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <textarea
                    className="w-full border-2 border-white/50 p-3 text-sm h-24 outline-none rounded shadow-inner bg-white/70 italic"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Sales description (appears on invoices)"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Sales Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          className="w-full border-2 border-white p-2 pl-7 text-lg font-black bg-white rounded shadow-sm outline-none focus:border-blue-400"
                          value={formData.salesPrice}
                          onChange={e => setFormData({ ...formData, salesPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Income Account</label>
                      <select
                        className="w-full border-2 border-white p-2 text-sm font-bold bg-white rounded shadow-sm outline-none focus:border-blue-400 appearance-none"
                        value={formData.incomeAccountId}
                        onChange={e => setFormData({ ...formData, incomeAccountId: e.target.value })}
                      >
                        <option value="">Select Account...</option>
                        {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Purchase Information */}
            <div className={`p-6 rounded-xl border-2 transition-all ${formData.isPurchaseItem ? 'border-orange-100 bg-orange-50/20 shadow-lg ring-1 ring-orange-100' : 'border-gray-100 opacity-50'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPurchasePage"
                    className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                    checked={formData.isPurchaseItem}
                    onChange={e => setFormData({ ...formData, isPurchaseItem: e.target.checked })}
                  />
                  <label htmlFor="isPurchasePage" className="text-base font-black text-orange-950 cursor-pointer tracking-tight">I purchase this item</label>
                </div>
                <span className="text-2xl">📦</span>
              </div>

              {formData.isPurchaseItem && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <textarea
                    className="w-full border-2 border-white/50 p-3 text-sm h-24 outline-none rounded shadow-inner bg-white/70 italic"
                    value={formData.purchaseDescription}
                    onChange={e => setFormData({ ...formData, purchaseDescription: e.target.value })}
                    placeholder="Purchase description (appears on POs)"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Purchase Cost</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                        <input
                          type="number"
                          className="w-full border-2 border-white p-2 pl-7 text-lg font-black bg-white rounded shadow-sm outline-none focus:border-orange-400"
                          value={formData.cost}
                          onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Expense Account</label>
                      <select
                        className="w-full border-2 border-white p-2 text-sm font-bold bg-white rounded shadow-sm outline-none focus:border-orange-400 appearance-none"
                        value={formData.cogsAccountId}
                        onChange={e => setFormData({ ...formData, cogsAccountId: e.target.value })}
                      >
                        <option value="">Select Account...</option>
                        {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Preferred Supplier</label>
                    <select
                      className="w-full border-2 border-white p-2 text-sm font-bold bg-white rounded shadow-sm outline-none focus:border-orange-400 appearance-none"
                      value={formData.preferredVendorId || ''}
                      onChange={e => setFormData({ ...formData, preferredVendorId: e.target.value })}
                    >
                      <option value="">Select Preferred Supplier...</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
