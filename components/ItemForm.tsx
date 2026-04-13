
import React, { useState, useEffect, useCallback } from 'react';
import { Item, ItemType, Account, CustomFieldDefinition, Vendor, ItemCategory, UOMSet, Warehouse, PriceLevel, ItemVendor } from '../types';
import { fetchBOMHistory, fetchWarehouses } from '../services/api';
import BarcodeScanner from './BarcodeScanner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  initialData?: Item;
  accounts: Account[];
  items: Item[];
  vendors: Vendor[];
  customFields: CustomFieldDefinition[];
  itemCategories?: ItemCategory[];
  onUpdateItemCategories?: (cats: ItemCategory[]) => void;
  uomSets?: UOMSet[];
  priceLevels?: PriceLevel[];
}

const ItemForm: React.FC<Props> = ({ onClose, onSave, initialData, accounts, items, vendors, customFields, itemCategories = [], onUpdateItemCategories, uomSets = [], priceLevels = [] }) => {
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

  // Warehouses (for preferred warehouse + per-site reorder points)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  useEffect(() => {
    fetchWarehouses().then((whs: Warehouse[]) => setWarehouses(whs)).catch(() => {});
  }, []);

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // BOM History panel state
  const [showBOMHistory, setShowBOMHistory] = useState(false);
  const [bomHistory, setBOMHistory] = useState<{ itemName: string; currentBOM: any[]; revisions: any[] } | null>(null);
  const [bomHistoryLoading, setBOMHistoryLoading] = useState(false);
  const [bomHistoryError, setBOMHistoryError] = useState('');
  const [expandedRevision, setExpandedRevision] = useState<number | null>(null);

  const loadBOMHistory = useCallback(async () => {
    if (!initialData?.id) return;
    setBOMHistoryLoading(true);
    setBOMHistoryError('');
    try {
      const data = await fetchBOMHistory(initialData.id);
      setBOMHistory(data);
    } catch (err: any) {
      setBOMHistoryError(err.message || 'Failed to load BOM history');
    } finally {
      setBOMHistoryLoading(false);
    }
  }, [initialData?.id]);

  useEffect(() => {
    if (showBOMHistory) loadBOMHistory();
  }, [showBOMHistory, loadBOMHistory]);

  // State for inline "add new" category/subcategory
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  const activeCategories = itemCategories.filter(c => c.isActive);
  const selectedCat = activeCategories.find(c => c.name === formData.category);
  const availableSubcategories = selectedCat?.subcategories || [];

  const commitNewCategory = () => {
    const name = newCategoryInput.trim();
    if (!name) { setAddingCategory(false); return; }
    const existing = itemCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      const newCat: ItemCategory = { id: crypto.randomUUID(), name, subcategories: [], isActive: true };
      onUpdateItemCategories?.([...itemCategories, newCat]);
    }
    setFormData({ ...formData, category: name, subcategory: '' } as any);
    setNewCategoryInput('');
    setAddingCategory(false);
  };

  const commitNewSubcategory = () => {
    const name = newSubcategoryInput.trim();
    if (!name || !selectedCat) { setAddingSubcategory(false); return; }
    if (!selectedCat.subcategories.includes(name)) {
      const updated = itemCategories.map(c =>
        c.id === selectedCat.id ? { ...c, subcategories: [...c.subcategories, name] } : c
      );
      onUpdateItemCategories?.(updated);
    }
    setFormData({ ...formData, subcategory: name } as any);
    setNewSubcategoryInput('');
    setAddingSubcategory(false);
  };

  const ITEM_TYPES: ItemType[] = ['Service', 'Inventory Part', 'Inventory Assembly', 'Non-inventory Part', 'Other Charge', 'Subtotal', 'Group', 'Discount', 'Payment', 'Sales Tax Item', 'Sales Tax Group', 'Fixed Asset'];
  const incomeAccounts = accounts.filter(a => a.type === 'Income');
  const expenseAccounts = accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold');
  const assetAccounts = accounts.filter(a => a.type === 'Other Current Asset' || a.type === 'Inventory' || a.type === 'Asset');

  const handleSave = (stayOpen = false) => {
    if (!formData.name.trim()) {
      alert("Item Name/Number is required.");
      return;
    }
    if ((formData as any).isSubItem && !(formData as any).parentId) {
      alert("Please select a parent item for this sub-item.");
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
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">SKU</label>
                <input
                  className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                  value={formData.sku || ''}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Stock keeping unit"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Barcode</label>
                <div className="flex gap-2 items-center">
                  <input
                    className="flex-1 border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                    value={(formData as any).barcode || ''}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value } as any)}
                    placeholder="UPC / EAN / scan code"
                  />
                  <button
                    type="button"
                    title="Scan barcode"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="text-gray-400 hover:text-orange-500 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M3 17v2a2 2 0 002 2h2m10-18h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M8 7h.01M12 7h.01M16 7h.01M8 12h.01M12 12h.01M16 12h.01M8 17h.01M12 17h.01M16 17h.01" />
                    </svg>
                  </button>
                </div>
                {showBarcodeScanner && (
                  <BarcodeScanner
                    onDetected={code => {
                      setFormData({ ...formData, barcode: code } as any);
                      setShowBarcodeScanner(false);
                    }}
                    onClose={() => setShowBarcodeScanner(false)}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Category dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Category</label>
                {addingCategory ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      className="flex-1 border-b-2 border-blue-400 p-2 text-sm bg-transparent outline-none"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitNewCategory(); if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryInput(''); } }}
                      placeholder="New category name..."
                    />
                    <button onClick={commitNewCategory} className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-2 rounded">OK</button>
                    <button onClick={() => { setAddingCategory(false); setNewCategoryInput(''); }} className="text-[10px] font-black text-gray-400 hover:text-red-500 px-1">✕</button>
                  </div>
                ) : (
                  <select
                    className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                    value={formData.category || ''}
                    onChange={e => {
                      if (e.target.value === '__add__') { setAddingCategory(true); return; }
                      setFormData({ ...formData, category: e.target.value, subcategory: '' } as any);
                    }}
                  >
                    <option value="">— None —</option>
                    {activeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    <option value="__add__">＋ Add new category...</option>
                  </select>
                )}
              </div>

              {/* Subcategory dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Subcategory</label>
                {addingSubcategory ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      className="flex-1 border-b-2 border-blue-400 p-2 text-sm bg-transparent outline-none"
                      value={newSubcategoryInput}
                      onChange={e => setNewSubcategoryInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitNewSubcategory(); if (e.key === 'Escape') { setAddingSubcategory(false); setNewSubcategoryInput(''); } }}
                      placeholder="New subcategory name..."
                    />
                    <button onClick={commitNewSubcategory} className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-2 rounded">OK</button>
                    <button onClick={() => { setAddingSubcategory(false); setNewSubcategoryInput(''); }} className="text-[10px] font-black text-gray-400 hover:text-red-500 px-1">✕</button>
                  </div>
                ) : (
                  <select
                    className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                    value={(formData as any).subcategory || ''}
                    disabled={!formData.category || availableSubcategories.length === 0 && !selectedCat}
                    onChange={e => {
                      if (e.target.value === '__add__') { setAddingSubcategory(true); return; }
                      setFormData({ ...formData, subcategory: e.target.value } as any);
                    }}
                  >
                    <option value="">— None —</option>
                    {availableSubcategories.map(s => <option key={s} value={s}>{s}</option>)}
                    {selectedCat && <option value="__add__">＋ Add new subcategory...</option>}
                  </select>
                )}
                {!formData.category && (
                  <p className="text-[10px] text-gray-400">Select a category first</p>
                )}
              </div>
            </div>

            {/* Sub-item hierarchy */}
            <div className="space-y-3 bg-blue-50/40 border border-blue-100 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600 rounded"
                  checked={(formData as any).isSubItem || false}
                  onChange={e => setFormData({ ...formData, isSubItem: e.target.checked, parentId: e.target.checked ? formData.parentId : undefined } as any)}
                />
                <span className="text-sm font-black text-blue-900 uppercase tracking-widest">This item is a sub-item</span>
              </label>
              {(formData as any).isSubItem && (
                <div className="space-y-1 animate-in fade-in duration-300">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sub-item of</label>
                  <select
                    className="w-full border-b-2 border-blue-200 p-2 text-sm bg-transparent outline-none focus:border-blue-600 font-bold"
                    value={(formData as any).parentId || ''}
                    onChange={e => setFormData({ ...formData, parentId: e.target.value } as any)}
                  >
                    <option value="">Select parent item...</option>
                    {items
                      .filter(i => i.id !== formData.id)
                      .map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                    }
                  </select>
                  {(formData as any).isSubItem && !(formData as any).parentId && (
                    <p className="text-[10px] text-red-500 font-bold">Please select a parent item.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Unit of Measure Set (QB Enterprise) ── */}
            {uomSets.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Unit of Measure</label>
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 space-y-3">
                  {/* UOM Set picker */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">UOM Set</span>
                    <select
                      className="w-full border-b-2 border-gray-200 p-1.5 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).uomSetId || ''}
                      onChange={e => {
                        const setId = e.target.value;
                        const chosenSet = uomSets.find(s => s.id === setId);
                        setFormData({
                          ...formData,
                          uomSetId: setId || undefined,
                          defaultPurchaseUOM: chosenSet?.defaultPurchaseUnit || chosenSet?.baseUnit.name || '',
                          defaultSalesUOM: chosenSet?.defaultSalesUnit || chosenSet?.baseUnit.name || '',
                          unitOfMeasure: chosenSet?.baseUnit.name || formData.unitOfMeasure,
                        } as any);
                      }}
                    >
                      <option value="">— None —</option>
                      {uomSets.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Purchase / Sales UOM pickers — only when a set is chosen */}
                  {(formData as any).uomSetId && (() => {
                    const chosenSet = uomSets.find(s => s.id === (formData as any).uomSetId);
                    if (!chosenSet) return null;
                    const unitOptions = [
                      { name: chosenSet.baseUnit.name, abbreviation: chosenSet.baseUnit.abbreviation || '', conversionFactor: 1 },
                      ...chosenSet.relatedUnits.sort((a, b) => a.conversionFactor - b.conversionFactor),
                    ];
                    const purchaseUOM = (formData as any).defaultPurchaseUOM || chosenSet.baseUnit.name;
                    const salesUOM = (formData as any).defaultSalesUOM || chosenSet.baseUnit.name;
                    const purchaseUnit = unitOptions.find(u => u.name === purchaseUOM);
                    const salesUnit = unitOptions.find(u => u.name === salesUOM);
                    const convFactor = purchaseUnit && salesUnit
                      ? (purchaseUnit.conversionFactor / salesUnit.conversionFactor)
                      : 1;
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Purchase UOM</span>
                          <select
                            className="w-full border-b-2 border-gray-200 p-1.5 text-sm bg-transparent outline-none focus:border-blue-500"
                            value={purchaseUOM}
                            onChange={e => setFormData({ ...formData, defaultPurchaseUOM: e.target.value } as any)}
                          >
                            {unitOptions.map(u => (
                              <option key={u.name} value={u.name}>{u.name}{u.abbreviation ? ` (${u.abbreviation})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Sales UOM</span>
                          <select
                            className="w-full border-b-2 border-gray-200 p-1.5 text-sm bg-transparent outline-none focus:border-blue-500"
                            value={salesUOM}
                            onChange={e => setFormData({ ...formData, defaultSalesUOM: e.target.value } as any)}
                          >
                            {unitOptions.map(u => (
                              <option key={u.name} value={u.name}>{u.name}{u.abbreviation ? ` (${u.abbreviation})` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Conversion</span>
                          <div className="p-1.5 text-sm font-mono text-blue-700 border-b-2 border-blue-100 bg-blue-50 rounded">
                            1 {purchaseUOM} = {convFactor % 1 === 0 ? convFactor : convFactor.toFixed(4).replace(/\.?0+$/, '')} {salesUOM}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

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
            {(formData.type === 'Inventory Part' || formData.type === 'Inventory Assembly') && (
              <div className="space-y-4 pt-4 border-t-2 border-orange-100 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest">Inventory Tracking</h3>
                </div>

                {/* ── On-hand / On-PO / On-SO read-only derived fields (QB style) ── */}
                {initialData?.id && (
                  <div className="bg-orange-50/60 border border-orange-100 rounded-lg p-3">
                    <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Current Stock Status</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">On Hand</span>
                        <div className="p-2 text-sm font-black font-mono text-gray-800 border-b-2 border-orange-200 bg-white/70 rounded">
                          {(formData.onHand ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">On P.O.</span>
                        <div className="p-2 text-sm font-black font-mono text-blue-700 border-b-2 border-blue-100 bg-white/70 rounded">
                          {((formData as any).onPurchaseOrder ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">On S.O.</span>
                        <div className="p-2 text-sm font-black font-mono text-green-700 border-b-2 border-green-100 bg-white/70 rounded">
                          {((formData as any).onSalesOrder ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Read-only. Updated automatically by transactions.</p>
                  </div>
                )}

                {/* Opening quantities (new items only) / As-of date */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">
                      {initialData?.id ? 'Quantity on Hand' : 'Initial quantity on hand *'}
                    </label>
                    <input
                      type="number"
                      readOnly={!!initialData?.id}
                      className={`w-full border-b-2 border-orange-200 p-2 text-sm bg-transparent outline-none font-bold ${initialData?.id ? 'text-gray-400 cursor-default' : 'focus:border-orange-500'}`}
                      value={formData.onHand || ''}
                      onChange={e => { if (!initialData?.id) setFormData({ ...formData, onHand: parseFloat(e.target.value) || 0 }); }}
                    />
                    {initialData?.id && <p className="text-[10px] text-gray-400">Adjust via Inventory Adjustment form.</p>}
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

                {/* Reorder / Max */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Reorder Point</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.reorderPoint || ''}
                      onChange={e => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
                      placeholder="Min qty before reorder"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Reorder Qty</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={(formData as any).reorderQty || ''}
                      onChange={e => setFormData({ ...formData, reorderQty: parseFloat(e.target.value) || 0 } as any)}
                      placeholder="Preferred order qty"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Max Stock</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={(formData as any).maxStock || ''}
                      onChange={e => setFormData({ ...formData, maxStock: parseFloat(e.target.value) || 0 } as any)}
                      placeholder="Max qty to stock"
                    />
                  </div>
                </div>

                {/* ── Preferred Warehouse ─────────────────────────────────────────────── */}
                {warehouses.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Preferred Warehouse</label>
                    <select
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={(formData as any).preferredWarehouseId || ''}
                      onChange={e => setFormData({ ...formData, preferredWarehouseId: e.target.value || undefined } as any)}
                    >
                      <option value="">— No preference (use default warehouse) —</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' ★' : ''}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400">Default site for picking and receiving this item.</p>
                  </div>
                )}

                {/* ── On Hand by Site (read-only) ─────────────────────────────────────── */}
                {warehouses.length > 0 && ((formData as any).warehouseQuantities?.length > 0) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">On Hand by Site</label>
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                            <th className="px-3 py-1.5 text-left">Warehouse</th>
                            <th className="px-3 py-1.5 text-right w-24">On Hand</th>
                            <th className="px-3 py-1.5 text-right w-28">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((formData as any).warehouseQuantities as { warehouseId: string; onHand: number; value: number }[])
                            .map((wq, i) => {
                              const wh = warehouses.find(w => w.id === wq.warehouseId);
                              return (
                                <tr key={i} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                  <td className="px-3 py-1 font-semibold text-gray-700">
                                    {wh?.name || (wq.warehouseId === 'DEFAULT' ? 'Default Warehouse' : wq.warehouseId)}
                                  </td>
                                  <td className="px-3 py-1 text-right font-mono font-bold text-gray-800">
                                    {wq.onHand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-3 py-1 text-right font-mono text-gray-600">
                                    ${wq.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400">Live quantities from lot records. Update by transferring or receiving inventory.</p>
                  </div>
                )}

                {/* ── Per-Site Reorder Points ─────────────────────────────────────────── */}
                {warehouses.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">
                      Reorder Points by Site
                      <span className="ml-2 text-[9px] font-normal normal-case text-gray-400">(overrides global reorder point per warehouse)</span>
                    </label>
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                            <th className="px-3 py-1.5 text-left">Warehouse</th>
                            <th className="px-2 py-1.5 text-right w-24">Reorder Pt</th>
                            <th className="px-2 py-1.5 text-right w-24">Reorder Qty</th>
                            <th className="px-2 py-1.5 text-right w-24">Max Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {warehouses.map(wh => {
                            const existing = ((formData as any).warehouseReorderPoints || []) as { warehouseId: string; reorderPoint: number; reorderQty: number; maxStock: number }[];
                            const entry = existing.find(rp => rp.warehouseId === wh.id) || { warehouseId: wh.id, reorderPoint: 0, reorderQty: 0, maxStock: 0 };
                            const update = (field: string, val: number) => {
                              const updated = existing.filter(rp => rp.warehouseId !== wh.id);
                              const newEntry = { ...entry, [field]: val };
                              // Only persist rows where at least one value is non-zero
                              if (newEntry.reorderPoint > 0 || newEntry.reorderQty > 0 || newEntry.maxStock > 0) {
                                updated.push(newEntry);
                              }
                              setFormData({ ...formData, warehouseReorderPoints: updated } as any);
                            };
                            return (
                              <tr key={wh.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <td className="px-3 py-1 font-semibold text-gray-700">
                                  {wh.name}{wh.isDefault ? <span className="ml-1 text-[9px] text-amber-500">★ Default</span> : ''}
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="0" step="any"
                                    className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400 px-1"
                                    value={entry.reorderPoint || ''}
                                    placeholder={formData.reorderPoint ? String(formData.reorderPoint) : '—'}
                                    onChange={e => update('reorderPoint', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="0" step="any"
                                    className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400 px-1"
                                    value={entry.reorderQty || ''}
                                    placeholder={(formData as any).reorderQty ? String((formData as any).reorderQty) : '—'}
                                    onChange={e => update('reorderQty', parseFloat(e.target.value) || 0)} />
                                </td>
                                <td className="px-2 py-1">
                                  <input type="number" min="0" step="any"
                                    className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400 px-1"
                                    value={entry.maxStock || ''}
                                    placeholder={(formData as any).maxStock ? String((formData as any).maxStock) : '—'}
                                    onChange={e => update('maxStock', parseFloat(e.target.value) || 0)} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400">Leave blank to use the global reorder point above.</p>
                  </div>
                )}

                {/* Asset account + Valuation method */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Inventory Asset Account *</label>
                    <select
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={formData.assetAccountId || ''}
                      onChange={e => setFormData({ ...formData, assetAccountId: e.target.value })}
                    >
                      <option value="">Select Asset Account...</option>
                      {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Valuation Method</label>
                    <select
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                      value={(formData as any).valuationMethod || 'Average'}
                      onChange={e => setFormData({ ...formData, valuationMethod: e.target.value } as any)}
                    >
                      <option value="Average">Average Cost (Default)</option>
                      <option value="FIFO">FIFO — First In, First Out</option>
                      <option value="Standard">Standard Cost</option>
                    </select>
                  </div>
                </div>

                {/* Standard Cost (shown only for Standard method) */}
                {(formData as any).valuationMethod === 'Standard' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Standard Cost</label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                      <input
                        type="number"
                        className="w-full border-b-2 border-orange-200 p-2 pl-7 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                        value={(formData as any).standardCost || ''}
                        onChange={e => setFormData({ ...formData, standardCost: parseFloat(e.target.value) || 0 } as any)}
                      />
                    </div>
                  </div>
                )}

                {/* Lot / Serial tracking */}
                <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-3">
                  <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Tracking Options</p>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-orange-600 rounded"
                        checked={(formData as any).trackLots || false}
                        onChange={e => setFormData({ ...formData, trackLots: e.target.checked } as any)}
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Lot / Batch Tracking</span>
                        <span className="text-xs text-gray-500 ml-2">Track expiration dates, lot numbers per receipt</span>
                      </div>
                    </label>
                    {/* QB Enterprise: lot picking method shown when lot tracking is on */}
                    {(formData as any).trackLots && (
                      <div className="ml-7 flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 animate-in fade-in duration-200">
                        <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest whitespace-nowrap">Picking Method</span>
                        <div className="flex gap-3">
                          {[
                            { value: 'FIFO', label: 'FIFO', desc: 'First In, First Out (oldest first)' },
                            { value: 'FEFO', label: 'FEFO', desc: 'First Expiry, First Out (soonest expiry first)' }
                          ].map(opt => (
                            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                className="accent-orange-600"
                                checked={((formData as any).lotPickingMethod || 'FIFO') === opt.value}
                                onChange={() => setFormData({ ...formData, lotPickingMethod: opt.value } as any)}
                              />
                              <span className="text-xs font-black text-gray-700">{opt.label}</span>
                              <span className="text-[10px] text-gray-400">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-orange-600 rounded"
                        checked={(formData as any).trackSerialNumbers || false}
                        onChange={e => setFormData({ ...formData, trackSerialNumbers: e.target.checked } as any)}
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-800">Serial Number Tracking</span>
                        <span className="text-xs text-gray-500 ml-2">Track individual units with unique serial numbers</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Manufacturer / Vendor details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Manufacturer</label>
                    <input
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).manufacturer || ''}
                      onChange={e => setFormData({ ...formData, manufacturer: e.target.value } as any)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Mfr Part No.</label>
                    <input
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).manufacturerPartNumber || ''}
                      onChange={e => setFormData({ ...formData, manufacturerPartNumber: e.target.value } as any)}
                    />
                  </div>
                </div>

                {/* Vendor details */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Vendor SKU</label>
                    <input
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).vendorSKU || ''}
                      onChange={e => setFormData({ ...formData, vendorSKU: e.target.value } as any)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Lead Time (days)</label>
                    <input
                      type="number"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).vendorLeadTimeDays || ''}
                      onChange={e => setFormData({ ...formData, vendorLeadTimeDays: parseInt(e.target.value) || 0 } as any)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Min. Order Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="w-full border-b-2 border-gray-200 p-2 text-sm bg-transparent outline-none focus:border-blue-500"
                      value={(formData as any).minimumOrderQty || ''}
                      onChange={e => setFormData({ ...formData, minimumOrderQty: parseFloat(e.target.value) || 0 } as any)}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>

                {/* Build Point for Assemblies */}
                {formData.type === 'Inventory Assembly' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Build Point</label>
                      <input
                        type="number"
                        className="w-full border-b-2 border-orange-200 p-2 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                        value={formData.buildPoint || ''}
                        onChange={e => setFormData({ ...formData, buildPoint: parseFloat(e.target.value) || 0 })}
                        placeholder="Auto-build when below this qty"
                      />
                    </div>
                  </div>
                )}

                {/* BOM Component Items — only for Inventory Assembly */}
                {formData.type === 'Inventory Assembly' && (
                  <div className="space-y-3 pt-4 border-t-2 border-orange-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔩</span>
                        <h3 className="text-sm font-black text-orange-900 uppercase tracking-widest">Bill of Materials (Components)</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          assemblyItems: [...(formData.assemblyItems || []), { itemId: '', quantity: 1 }]
                        })}
                        className="text-xs font-black text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded transition-colors"
                      >
                        + Add Component
                      </button>
                    </div>

                    {(!formData.assemblyItems || formData.assemblyItems.length === 0) ? (
                      <p className="text-xs text-gray-400 italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                        No components added yet. Click "+ Add Component" to build the BOM.
                      </p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-orange-50 border-b border-orange-100">
                            <tr>
                              <th className="text-left text-[10px] font-black text-orange-800 uppercase tracking-widest px-3 py-2">Component Item</th>
                              <th className="text-center text-[10px] font-black text-orange-800 uppercase tracking-widest px-3 py-2 w-20">Qty</th>
                              <th className="text-center text-[10px] font-black text-orange-800 uppercase tracking-widest px-3 py-2 w-20" title="Scrap added on top of required quantity (%)">Scrap %</th>
                              <th className="text-center text-[10px] font-black text-orange-800 uppercase tracking-widest px-3 py-2 w-20" title="Percentage of input quantity that yields usable output (%)">Yield %</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(formData.assemblyItems || []).map((comp, idx) => {
                              const compItem = items.find(i => i.id === comp.itemId);
                              const scrap = (comp as any).scrapPercent || 0;
                              const yield_ = (comp as any).yieldPercent || 100;
                              const effQty = +(comp.quantity * (1 + scrap / 100) / (yield_ / 100)).toFixed(4);
                              return (
                                <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <select
                                      className="w-full border-b border-gray-200 p-1 text-sm bg-transparent outline-none focus:border-orange-500 font-medium"
                                      value={comp.itemId}
                                      onChange={e => {
                                        const updated = [...(formData.assemblyItems || [])];
                                        updated[idx] = { ...updated[idx], itemId: e.target.value };
                                        setFormData({ ...formData, assemblyItems: updated });
                                      }}
                                    >
                                      <option value="">Select item...</option>
                                      {items
                                        .filter(i => i.id !== formData.id && (i.type === 'Inventory Part' || i.type === 'Inventory Assembly' || i.type === 'Non-inventory Part' || i.type === 'Service'))
                                        .map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                                      }
                                    </select>
                                    {compItem && (
                                      <span className="text-[10px] text-gray-400 ml-1">{compItem.type}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0.0001"
                                      step="any"
                                      className="w-full text-center border-b border-gray-200 p-1 text-sm bg-transparent outline-none focus:border-orange-500 font-bold"
                                      value={comp.quantity}
                                      onChange={e => {
                                        const updated = [...(formData.assemblyItems || [])];
                                        updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 1 };
                                        setFormData({ ...formData, assemblyItems: updated });
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className="w-full text-center border-b border-gray-200 p-1 text-sm bg-transparent outline-none focus:border-orange-500 font-mono"
                                      value={(comp as any).scrapPercent ?? ''}
                                      placeholder="0"
                                      title="Scrap %: extra material consumed beyond base qty"
                                      onChange={e => {
                                        const updated = [...(formData.assemblyItems || [])];
                                        updated[idx] = { ...updated[idx], scrapPercent: parseFloat(e.target.value) || 0 } as any;
                                        setFormData({ ...formData, assemblyItems: updated });
                                      }}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        step="0.01"
                                        className="w-full text-center border-b border-gray-200 p-1 text-sm bg-transparent outline-none focus:border-orange-500 font-mono"
                                        value={(comp as any).yieldPercent ?? ''}
                                        placeholder="100"
                                        title="Yield %: percentage of input that becomes usable output"
                                        onChange={e => {
                                          const updated = [...(formData.assemblyItems || [])];
                                          updated[idx] = { ...updated[idx], yieldPercent: parseFloat(e.target.value) || 100 } as any;
                                          setFormData({ ...formData, assemblyItems: updated });
                                        }}
                                      />
                                      {(scrap > 0 || yield_ !== 100) && (
                                        <span className="text-[9px] text-orange-600 font-bold">eff: {effQty}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (formData.assemblyItems || []).filter((_, i) => i !== idx);
                                        setFormData({ ...formData, assemblyItems: updated });
                                      }}
                                      className="text-red-400 hover:text-red-600 font-black text-base leading-none"
                                      title="Remove"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400">Components are deducted from stock when an Assembly Build transaction is posted.</p>

                    {/* BOM Revision History — only visible when editing an existing assembly */}
                    {initialData?.id && (
                      <div className="pt-3 border-t border-orange-100">
                        <button
                          type="button"
                          onClick={() => setShowBOMHistory(v => !v)}
                          className="flex items-center gap-2 text-xs font-black text-orange-700 hover:text-orange-900 transition-colors"
                        >
                          <span className="text-base">{showBOMHistory ? '▾' : '▸'}</span>
                          BOM Revision History
                          {bomHistory && bomHistory.revisions.length > 0 && (
                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                              {bomHistory.revisions.length}
                            </span>
                          )}
                        </button>

                        {showBOMHistory && (
                          <div className="mt-3 space-y-2">
                            {bomHistoryLoading && (
                              <p className="text-xs text-gray-400 italic">Loading history…</p>
                            )}
                            {bomHistoryError && (
                              <p className="text-xs text-red-500">{bomHistoryError}</p>
                            )}
                            {!bomHistoryLoading && bomHistory && bomHistory.revisions.length === 0 && (
                              <p className="text-xs text-gray-400 italic text-center py-3 border border-dashed border-gray-200 rounded">
                                No revision history yet. History is recorded each time you save a BOM change.
                              </p>
                            )}
                            {!bomHistoryLoading && bomHistory && bomHistory.revisions.length > 0 && (
                              <div className="border border-orange-100 rounded-lg overflow-hidden text-xs">
                                {/* Table header */}
                                <div className="grid grid-cols-[60px_1fr_80px_1fr] bg-orange-50 border-b border-orange-100 font-black text-[10px] text-orange-800 uppercase tracking-widest px-3 py-1.5">
                                  <span>Rev #</span>
                                  <span>Date</span>
                                  <span>By</span>
                                  <span>Changes</span>
                                </div>
                                {bomHistory.revisions.map((rev, idx) => (
                                  <div key={idx} className="border-b border-gray-100 last:border-0">
                                    <button
                                      type="button"
                                      className="w-full grid grid-cols-[60px_1fr_80px_1fr] items-center px-3 py-2 hover:bg-orange-50 text-left transition-colors gap-1"
                                      onClick={() => setExpandedRevision(expandedRevision === idx ? null : idx)}
                                    >
                                      <span className="font-black text-orange-700">
                                        {rev.revisionNo === 0 ? 'Init' : `#${rev.revisionNo}`}
                                      </span>
                                      <span className="text-gray-600">
                                        {rev.date ? new Date(rev.date).toLocaleDateString() : '—'}
                                      </span>
                                      <span className="text-gray-500 truncate">{rev.changedBy || '—'}</span>
                                      <span className="text-gray-700 italic truncate">{rev.note}</span>
                                    </button>

                                    {expandedRevision === idx && rev.assemblyItems?.length > 0 && (
                                      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-1">
                                          {rev.revisionNo === 0 ? 'Initial BOM snapshot' : 'BOM snapshot before this change'}
                                        </p>
                                        <table className="w-full text-[11px]">
                                          <thead>
                                            <tr className="text-[10px] text-gray-400 uppercase">
                                              <th className="text-left pb-1">Component</th>
                                              <th className="text-right pb-1 w-16">Qty</th>
                                              <th className="text-right pb-1 w-16">Scrap%</th>
                                              <th className="text-right pb-1 w-16">Yield%</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rev.assemblyItems.map((c: any, ci: number) => {
                                              const compItem = items.find(i => i.id === c.itemId);
                                              return (
                                                <tr key={ci} className="border-t border-gray-100">
                                                  <td className="py-0.5 text-gray-700 font-medium">
                                                    {compItem ? compItem.name : <span className="text-red-400 italic">{c.itemId} (deleted)</span>}
                                                  </td>
                                                  <td className="text-right font-mono text-gray-600">{c.quantity}</td>
                                                  <td className="text-right font-mono text-gray-500">{c.scrapPercent ?? 0}%</td>
                                                  <td className="text-right font-mono text-gray-500">{c.yieldPercent ?? 100}%</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Group Item Component List ─────────────────────────────────── */}
            {formData.type === 'Group' && (
              <div className="space-y-3 pt-4 border-t-2 border-purple-100 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Group Components</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Items included in this group when sold</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-purple-600"
                        checked={!!formData.printItemsInGroup}
                        onChange={e => setFormData({ ...formData, printItemsInGroup: e.target.checked } as any)}
                      />
                      Print items in group
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        groupItems: [...(formData.groupItems || []), { itemId: '', quantity: 1 }]
                      } as any)}
                      className="text-xs font-black text-white bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded transition-colors"
                    >+ Add Item</button>
                  </div>
                </div>

                {(!formData.groupItems || formData.groupItems.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                    No items in this group yet. Click "+ Add Item" to build the group.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-purple-50 border-b border-purple-100">
                        <tr className="text-[10px] text-purple-700 uppercase font-black">
                          <th className="text-left px-3 py-1.5 w-1/2">Item</th>
                          <th className="text-right px-3 py-1.5 w-20">Qty</th>
                          <th className="text-right px-3 py-1.5 w-20">Unit Price</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.groupItems || []).map((gi: any, idx: number) => {
                          const gItem = items.find(i => i.id === gi.itemId);
                          return (
                            <tr key={idx} className="border-t border-gray-100 hover:bg-purple-50/30">
                              <td className="px-3 py-1.5">
                                <select
                                  value={gi.itemId || ''}
                                  onChange={e => {
                                    const updated = [...(formData.groupItems || [])];
                                    updated[idx] = { ...updated[idx], itemId: e.target.value };
                                    setFormData({ ...formData, groupItems: updated } as any);
                                  }}
                                  className="w-full border-b border-gray-200 bg-transparent outline-none text-xs focus:border-purple-400"
                                >
                                  <option value="">— Select item —</option>
                                  {items
                                    .filter(i => i.isActive && !['Group', 'Subtotal', 'Payment'].includes(i.type))
                                    .map(i => (
                                      <option key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ''}</option>
                                    ))}
                                </select>
                              </td>
                              <td className="px-3 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={gi.quantity ?? 1}
                                  onChange={e => {
                                    const updated = [...(formData.groupItems || [])];
                                    updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 1 };
                                    setFormData({ ...formData, groupItems: updated } as any);
                                  }}
                                  className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-purple-400"
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-gray-500">
                                {gItem ? (gItem.salesPrice || 0).toFixed(2) : '—'}
                              </td>
                              <td className="px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (formData.groupItems || []).filter((_: any, i: number) => i !== idx);
                                    setFormData({ ...formData, groupItems: updated } as any);
                                  }}
                                  className="text-red-400 hover:text-red-600 font-black text-base leading-none"
                                >×</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-purple-100 bg-purple-50">
                        <tr>
                          <td className="px-3 py-1.5 text-[10px] font-black text-purple-700 uppercase">
                            {(formData.groupItems || []).length} item(s)
                          </td>
                          <td className="px-3 py-1.5 text-right text-[10px] font-black text-purple-700 font-mono">
                            {(formData.groupItems || []).reduce((s: number, gi: any) => s + (gi.quantity || 0), 0)} total qty
                          </td>
                          <td className="px-3 py-1.5 text-right text-[10px] font-black text-purple-700 font-mono">
                            ${(formData.groupItems || []).reduce((s: number, gi: any) => {
                              const gItem = items.find(i => i.id === gi.itemId);
                              return s + (gItem ? (gItem.salesPrice || 0) * (gi.quantity || 1) : 0);
                            }, 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Fixed Asset Fields ──────────────────────────────────────────── */}
            {formData.type === 'Fixed Asset' && (
              <div className="space-y-4 pt-4 border-t-2 border-teal-100 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Fixed Asset Details</h3>
                  <div className="h-0.5 flex-1 bg-teal-100"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Purchase Date</label>
                    <input
                      type="date"
                      value={(formData as any).purchaseDate || ''}
                      onChange={e => setFormData({ ...formData, purchaseDate: e.target.value } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Purchase Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData as any).purchaseCost ?? ''}
                      onChange={e => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) || 0 } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 text-right font-mono focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Asset Tag</label>
                    <input
                      type="text"
                      value={(formData as any).assetTag || ''}
                      onChange={e => setFormData({ ...formData, assetTag: e.target.value } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                      placeholder="FA-0001"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Serial Number</label>
                    <input
                      type="text"
                      value={(formData as any).serialNumber || ''}
                      onChange={e => setFormData({ ...formData, serialNumber: e.target.value } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Physical Location</label>
                  <input
                    type="text"
                    value={(formData as any).location || ''}
                    onChange={e => setFormData({ ...formData, location: e.target.value } as any)}
                    className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    placeholder="Building A, Room 204"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Asset Description</label>
                  <input
                    type="text"
                    value={(formData as any).assetDescription || ''}
                    onChange={e => setFormData({ ...formData, assetDescription: e.target.value } as any)}
                    className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    placeholder="Detailed description for asset register"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Depreciation Method</label>
                    <select
                      value={(formData as any).depreciationMethod || 'Straight-Line'}
                      onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    >
                      {['Straight-Line', 'MACRS', 'Double-Declining', 'Sum-of-Years-Digits', 'Units-of-Production', 'None'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Useful Life (Years)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={(formData as any).usefulLifeYears ?? ''}
                      onChange={e => setFormData({ ...formData, usefulLifeYears: parseInt(e.target.value) || 0 } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 text-right font-mono focus:border-teal-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Salvage Value</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData as any).salvageValue ?? ''}
                      onChange={e => setFormData({ ...formData, salvageValue: parseFloat(e.target.value) || 0 } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 text-right font-mono focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Accumulated Depreciation</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData as any).accumulatedDepreciation ?? ''}
                      onChange={e => setFormData({ ...formData, accumulatedDepreciation: parseFloat(e.target.value) || 0 } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 text-right font-mono focus:border-teal-400"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Net Book Value</label>
                    <div className="py-1 text-sm font-mono font-black text-teal-700 border-b-2 border-teal-100 text-right">
                      ${(((formData as any).purchaseCost || (formData as any).cost || 0) - ((formData as any).accumulatedDepreciation || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-teal-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Disposal Date</label>
                    <input
                      type="date"
                      value={(formData as any).disposalDate || ''}
                      onChange={e => setFormData({ ...formData, disposalDate: e.target.value } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 focus:border-teal-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Disposal Proceeds</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(formData as any).disposalAmount ?? ''}
                      onChange={e => setFormData({ ...formData, disposalAmount: parseFloat(e.target.value) || 0 } as any)}
                      className="w-full border-b-2 border-gray-200 bg-transparent outline-none text-sm py-1 text-right font-mono focus:border-teal-400"
                    />
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

                  {/* ── Discount-specific fields (only for Discount type) ── */}
                  {formData.type === 'Discount' ? (
                    <div className="space-y-3 bg-yellow-50/60 border border-yellow-200 rounded-lg p-4">
                      <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">Discount Settings</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Discount Type</label>
                          <select
                            className="w-full border-2 border-white p-2 text-sm font-bold bg-white rounded shadow-sm outline-none focus:border-yellow-400"
                            value={(formData as any).discountType || 'Percent'}
                            onChange={e => setFormData({ ...formData, discountType: e.target.value as any } as any)}
                          >
                            <option value="Percent">Percentage (%)</option>
                            <option value="Fixed">Fixed Amount ($)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          {((formData as any).discountType || 'Percent') === 'Percent' ? (
                            <>
                              <label className="text-[10px] font-black text-gray-400 uppercase">Discount %</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="w-full border-2 border-white p-2 pr-7 text-lg font-black bg-white rounded shadow-sm outline-none focus:border-yellow-400"
                                  value={(formData as any).discountRate ?? ''}
                                  onChange={e => setFormData({ ...formData, discountRate: parseFloat(e.target.value) || 0 } as any)}
                                  placeholder="0.00"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <label className="text-[10px] font-black text-gray-400 uppercase">Discount Amount</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full border-2 border-white p-2 pl-7 text-lg font-black bg-white rounded shadow-sm outline-none focus:border-yellow-400"
                                  value={(formData as any).discountAmount ?? ''}
                                  onChange={e => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 } as any)}
                                  placeholder="0.00"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Income Account</label>
                        <select
                          className="w-full border-2 border-white p-2 text-sm font-bold bg-white rounded shadow-sm outline-none focus:border-yellow-400 appearance-none"
                          value={formData.incomeAccountId || ''}
                          onChange={e => setFormData({ ...formData, incomeAccountId: e.target.value })}
                        >
                          <option value="">Select Account...</option>
                          {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {/* ── Price Level per-item overrides ── */}
                  {priceLevels.filter(pl => pl.isActive && pl.type === 'Per Item').length > 0 && formData.type !== 'Discount' && (
                    <div className="space-y-2 pt-2 border-t border-blue-100">
                      <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest">
                        Price Level Overrides
                        <span className="ml-2 text-[9px] font-normal normal-case text-gray-400">(Per Item price levels only)</span>
                      </label>
                      <div className="border border-blue-100 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-blue-50 border-b border-blue-100">
                            <tr className="text-[10px] font-black text-blue-700 uppercase tracking-wide">
                              <th className="px-3 py-1.5 text-left">Price Level</th>
                              <th className="px-3 py-1.5 text-right w-32">Price ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {priceLevels.filter(pl => pl.isActive && pl.type === 'Per Item').map(pl => {
                              const existing = ((formData as any).priceLevelPrices || []) as { priceLevelId: string; price: number }[];
                              const entry = existing.find(e => e.priceLevelId === pl.id);
                              return (
                                <tr key={pl.id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30">
                                  <td className="px-3 py-1.5 font-semibold text-gray-700">{pl.name}</td>
                                  <td className="px-3 py-1.5">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1 text-gray-400 text-xs">$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-blue-400 pl-4"
                                        value={entry?.price ?? ''}
                                        placeholder={formData.salesPrice != null ? String(formData.salesPrice) : '—'}
                                        onChange={e => {
                                          const val = parseFloat(e.target.value);
                                          const others = existing.filter(x => x.priceLevelId !== pl.id);
                                          const updated = isNaN(val)
                                            ? others
                                            : [...others, { priceLevelId: pl.id, price: val }];
                                          setFormData({ ...formData, priceLevelPrices: updated } as any);
                                        }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-gray-400">Leave blank to use default price. Applied automatically when a customer has this price level.</p>
                    </div>
                  )}
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

                  {/* ── Multiple Vendors (QB Enterprise) ── */}
                  <div className="space-y-2 pt-2 border-t border-orange-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-orange-800 uppercase tracking-widest">
                        Vendor List
                        <span className="ml-2 text-[9px] font-normal normal-case text-gray-400">(Enterprise: multiple vendors with individual prices &amp; SKUs)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const current: ItemVendor[] = (formData as any).vendors || [];
                          setFormData({ ...formData, vendors: [...current, { vendorId: '', vendorSKU: '', price: undefined, leadTimeDays: undefined, minimumOrderQty: undefined, isPreferred: false }] } as any);
                        }}
                        className="text-[10px] font-black text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded transition-colors"
                      >
                        + Add Vendor
                      </button>
                    </div>
                    {((formData as any).vendors as ItemVendor[] | undefined)?.length ? (
                      <div className="border border-orange-100 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-orange-50 border-b border-orange-100">
                            <tr className="text-[10px] font-black text-orange-700 uppercase tracking-wide">
                              <th className="px-2 py-1.5 text-left">Vendor</th>
                              <th className="px-2 py-1.5 text-left w-24">SKU</th>
                              <th className="px-2 py-1.5 text-right w-20">Price</th>
                              <th className="px-2 py-1.5 text-right w-16">Lead Days</th>
                              <th className="px-2 py-1.5 text-right w-16">Min Qty</th>
                              <th className="px-2 py-1.5 text-center w-14">Preferred</th>
                              <th className="w-6"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {((formData as any).vendors as ItemVendor[]).map((vl, idx) => {
                              const updateVendorRow = (patch: Partial<ItemVendor>) => {
                                const updated = [...((formData as any).vendors as ItemVendor[])];
                                updated[idx] = { ...updated[idx], ...patch };
                                setFormData({ ...formData, vendors: updated } as any);
                              };
                              return (
                                <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-orange-50/30">
                                  <td className="px-2 py-1">
                                    <select
                                      className="w-full border-b border-gray-200 bg-transparent outline-none text-xs focus:border-orange-400"
                                      value={vl.vendorId || ''}
                                      onChange={e => updateVendorRow({ vendorId: e.target.value })}
                                    >
                                      <option value="">Select...</option>
                                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-2 py-1">
                                    <input className="w-full border-b border-gray-200 bg-transparent outline-none text-xs focus:border-orange-400"
                                      value={vl.vendorSKU || ''}
                                      onChange={e => updateVendorRow({ vendorSKU: e.target.value })}
                                      placeholder="Vendor SKU" />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input type="number" min="0" step="0.01"
                                      className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400"
                                      value={vl.price ?? ''}
                                      onChange={e => updateVendorRow({ price: parseFloat(e.target.value) || undefined })}
                                      placeholder="—" />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input type="number" min="0"
                                      className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400"
                                      value={vl.leadTimeDays ?? ''}
                                      onChange={e => updateVendorRow({ leadTimeDays: parseInt(e.target.value) || undefined })}
                                      placeholder="—" />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input type="number" min="0" step="any"
                                      className="w-full text-right border-b border-gray-200 bg-transparent outline-none text-xs font-mono focus:border-orange-400"
                                      value={vl.minimumOrderQty ?? ''}
                                      onChange={e => updateVendorRow({ minimumOrderQty: parseFloat(e.target.value) || undefined })}
                                      placeholder="—" />
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    <input
                                      type="checkbox"
                                      className="accent-orange-600"
                                      checked={!!vl.isPreferred}
                                      onChange={e => {
                                        // Only one preferred at a time — clear others
                                        const updated = ((formData as any).vendors as ItemVendor[]).map((v2, i2) => ({
                                          ...v2,
                                          isPreferred: i2 === idx ? e.target.checked : false,
                                        }));
                                        // Sync preferredVendorId to match the checked row
                                        const preferred = updated.find(v2 => v2.isPreferred);
                                        setFormData({ ...formData, vendors: updated, preferredVendorId: preferred?.vendorId || formData.preferredVendorId } as any);
                                      }}
                                    />
                                  </td>
                                  <td className="px-1 py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = ((formData as any).vendors as ItemVendor[]).filter((_, i) => i !== idx);
                                        setFormData({ ...formData, vendors: updated } as any);
                                      }}
                                      className="text-red-400 hover:text-red-600 font-black text-base leading-none"
                                    >×</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic text-center py-2 border border-dashed border-gray-200 rounded">
                        No vendor entries. Click "+ Add Vendor" to add multiple suppliers.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Substitute / Alternate Items ─────────────────────────────── */}
            {!['Group', 'Subtotal', 'Payment', 'Discount', 'Sales Tax Item', 'Sales Tax Group'].includes(formData.type) && (
              <div className="p-6 rounded-xl border-2 border-gray-100 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Substitute / Alternate Items</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Items offered when this item is out of stock</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, substituteItems: [...((formData as any).substituteItems || []), { itemId: '', reason: '' }] } as any)}
                    className="text-xs font-black text-white bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
                  >+ Add Substitute</button>
                </div>

                {((formData as any).substituteItems || []).length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic text-center py-3 border border-dashed border-gray-200 rounded">
                    No substitute items defined.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {((formData as any).substituteItems || []).map((sub: { itemId: string; reason?: string }, idx: number) => {
                      const subItem = items.find(i => i.id === sub.itemId);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={sub.itemId}
                            onChange={e => {
                              const updated = [...((formData as any).substituteItems || [])];
                              updated[idx] = { ...updated[idx], itemId: e.target.value };
                              setFormData({ ...formData, substituteItems: updated } as any);
                            }}
                            className="flex-1 border border-gray-200 rounded text-xs px-2 py-1 bg-white focus:border-gray-400 outline-none"
                          >
                            <option value="">— Select item —</option>
                            {items
                              .filter(i => i.isActive && i.id !== formData.id)
                              .map(i => (
                                <option key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ''}</option>
                              ))}
                          </select>
                          <input
                            type="text"
                            value={sub.reason || ''}
                            onChange={e => {
                              const updated = [...((formData as any).substituteItems || [])];
                              updated[idx] = { ...updated[idx], reason: e.target.value };
                              setFormData({ ...formData, substituteItems: updated } as any);
                            }}
                            placeholder="Reason (optional)"
                            className="w-32 border border-gray-200 rounded text-xs px-2 py-1 focus:border-gray-400 outline-none"
                          />
                          {subItem && (
                            <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                              {subItem.onHand ?? 0} on hand
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = ((formData as any).substituteItems || []).filter((_: any, i: number) => i !== idx);
                              setFormData({ ...formData, substituteItems: updated } as any);
                            }}
                            className="text-red-400 hover:text-red-600 font-black text-base leading-none"
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
