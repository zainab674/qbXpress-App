
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

const ItemForm: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, accounts, items, vendors, customFields }) => {
  const [activeTab, setActiveTab] = useState('Item Info');
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
    printItemsInGroup: false
  } as Item);

  if (!isOpen) return null;

  const ITEM_TYPES: ItemType[] = ['Service', 'Inventory Part', 'Non-inventory Part', 'Other Charge', 'Subtotal', 'Group', 'Discount', 'Payment', 'Sales Tax Item', 'Sales Tax Group'];
  const incomeAccounts = accounts.filter(a => a.type === 'Income');
  const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold');

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Item Name/Number is required.");
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="bg-[#003366] p-2 text-white font-bold text-sm flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
            <span>{initialData ? 'Edit' : 'New'} Item</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 px-2 font-serif">X</button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-300 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase italic text-gray-500">Type</label>
            <select className="border p-1 text-xs w-48 font-bold" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as ItemType })}>
              {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase italic text-gray-500">U/M</label>
            <select className="border p-1 text-xs w-24" value={formData.unitOfMeasure} onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}>
              <option>Each</option>
              <option>Hour</option>
              <option>Foot</option>
              <option>Square Ft</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-40 bg-gray-100 border-r border-gray-300 flex flex-col py-2">
            {['Item Info', 'Custom Fields'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-left px-4 py-2 text-[11px] font-bold ${activeTab === tab ? 'bg-white border-y border-gray-300 text-blue-800' : 'hover:bg-gray-200 text-gray-600'}`}>{tab}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'Item Info' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold uppercase w-32">Item Name/Number</label>
                  <input className="border p-1 text-xs flex-1 font-bold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-8 border-t pt-4">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Purchase Info</h4>
                    <textarea className="w-full border p-1 text-xs h-16 outline-none" value={formData.purchaseDescription} placeholder="Purchase description..." onChange={e => setFormData({ ...formData, purchaseDescription: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold w-12">Cost</label>
                      <input type="number" className="border p-1 text-xs w-24" value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">COGS Account</label>
                      <select className="w-full border p-1 text-xs outline-none bg-blue-50" value={formData.cogsAccountId} onChange={e => setFormData({ ...formData, cogsAccountId: e.target.value })}>
                        <option value="">&lt;Select Account&gt;</option>
                        {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    {formData.type === 'Inventory Part' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Preferred Vendor</label>
                        <select
                          className="w-full border p-1 text-xs outline-none"
                          value={formData.preferredVendorId}
                          onChange={e => setFormData({ ...formData, preferredVendorId: e.target.value })}
                        >
                          <option value="">&lt;Select Vendor&gt;</option>
                          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Sales Info</h4>
                    <textarea className="w-full border p-1 text-xs h-16 outline-none" value={formData.description} placeholder="Sales description..." onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold w-20">Sales Price</label>
                      <input type="number" className="border p-1 text-xs w-24 font-bold" value={formData.salesPrice} onChange={e => setFormData({ ...formData, salesPrice: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Income Account</label>
                      <select className="w-full border p-1 text-xs outline-none bg-blue-50" value={formData.incomeAccountId} onChange={e => setFormData({ ...formData, incomeAccountId: e.target.value })}>
                        <option value="">&lt;Select Account&gt;</option>
                        {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                {formData.type === 'Inventory Part' && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Inventory Asset Info</h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Asset Account</label>
                        <select
                          className="w-full border p-1 text-xs outline-none bg-gray-50"
                          value={formData.assetAccountId}
                          onChange={e => setFormData({ ...formData, assetAccountId: e.target.value })}
                        >
                          <option value="">Inventory Asset</option>
                          {accounts.filter(a => a.type === 'Other Current Asset').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded">
                          <div className="text-[10px] font-bold text-blue-800">AVERAGE COST</div>
                          <div className="text-sm font-black text-blue-900">${(formData.cost || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-red-600">Reorder Point</label>
                          <input type="number" className="border border-red-200 p-1 text-xs" value={formData.reorderPoint || 0} onChange={e => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })} />
                          <span className="text-[9px] text-gray-400 italic">QB will remind you to reorder at this level.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold">On Hand</label>
                          <input type="number" className="border p-1 text-xs bg-gray-100" value={formData.onHand || 0} readOnly />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formData.type === 'Discount' && (
                  <div className="border-t pt-4 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Discount Details</h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase italic text-gray-400">Amount or %</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="border p-2 text-sm flex-1 font-black text-blue-900 bg-yellow-50/30"
                            value={formData.discountRate || 0}
                            onChange={e => setFormData({ ...formData, discountRate: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="text-xs font-bold text-gray-400">Note: Use negative for discounts if needed, or positive for rate.</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Account</label>
                        <select
                          className="w-full border p-1.5 text-xs outline-none bg-blue-50"
                          value={formData.incomeAccountId}
                          onChange={e => setFormData({ ...formData, incomeAccountId: e.target.value })}
                        >
                          <option value="">&lt;Select Account&gt;</option>
                          {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.type === 'Sales Tax Item') && (
                  <div className="border-t pt-4 space-y-4 animate-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Sales Tax Information (Page 138)</h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500 italic">Tax Name</label>
                          <input className="border p-1.5 text-xs" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500 italic">Tax Rate (%)</label>
                          <input
                            type="number"
                            className="border p-1.5 text-xs font-bold text-blue-900 bg-red-50/30"
                            value={formData.taxRateValue || 0}
                            onChange={e => setFormData({ ...formData, taxRateValue: parseFloat(e.target.value) || 0, taxRate: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-gray-500 italic">Tax Agency (Vendor)</label>
                          <select
                            className="border p-1.5 text-xs bg-white"
                            value={formData.taxAgency}
                            onChange={e => setFormData({ ...formData, taxAgency: e.target.value })}
                          >
                            <option value="">&lt;Select Tax Agency&gt;</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'Custom Fields' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-blue-900 border-b pb-1 uppercase">Custom Fields (Page 101)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {customFields.filter(f => f.useForItem).map(f => (
                    <div key={f.id} className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                      <input className="border p-1 text-xs outline-none" value={formData.customFieldValues?.[f.id] || ''} onChange={e => setFormData({ ...formData, customFieldValues: { ...formData.customFieldValues, [f.id]: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-100 p-4 border-t border-gray-400 flex justify-end gap-2">
          <button onClick={handleSave} className="px-8 py-1.5 bg-[#0077c5] text-white text-xs font-bold rounded shadow-sm">OK</button>
          <button onClick={onClose} className="px-8 py-1.5 border border-gray-400 bg-white text-xs font-bold rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
