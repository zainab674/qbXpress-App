
import React, { useState, useEffect } from 'react';
import { Vendor, Item, Transaction, TransactionItem, Customer, QBClass, Attachment, Account, Warehouse, ShipViaEntry } from '../types';
import AddressSelector, { formatAddress } from './AddressSelector';
import { fetchWarehouses, fetchNextRefNo, uploadTransactionAttachment, deleteTransactionAttachment } from '../services/api';
import { createShippingBill, updateShippingBill } from '../services/shippingService';


interface Props {
  vendors: Vendor[];
  items: Item[];
  customers: Customer[];
  classes: QBClass[];
  accounts: Account[];
  transactions: Transaction[];
  shipVia?: ShipViaEntry[];
  onSave: (po: Transaction) => Promise<void> | void;
  onClose: () => void;
  initialData?: any;
}

const PurchaseOrderForm: React.FC<Props> = ({ vendors, items, customers, classes, accounts, transactions, shipVia = [], onSave, onClose, initialData }) => {
  const [activeTab, setActiveTab] = useState<'Expenses' | 'Items'>('Items');
  const [vendorId, setVendorId] = useState(initialData?.entityId || '');
  const [poDate, setPoDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate || new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState(initialData?.refNo || '');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [vendorMessage, setVendorMessage] = useState(initialData?.vendorMessage || '');
  const [shipToEntityId, setShipToEntityId] = useState(initialData?.customerId || '');
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Shipping module state
  const [selectedShipViaId, setSelectedShipViaId] = useState(
    initialData?.shipViaId || shipVia.find(sv => sv.isDefault)?.id || ''
  );
  const [shippingCost, setShippingCost] = useState<number>(initialData?.shippingCost || 0);
  const [classId, setClassId] = useState(initialData?.classId || '');
  const [customerInvoiceNo, setCustomerInvoiceNo] = useState(initialData?.customerInvoiceNo || '');
  const [shipToWarehouseId, setShipToWarehouseId] = useState(initialData?.shipToWarehouseId || '');
  const [salesOrderId, setSalesOrderId] = useState(initialData?.salesOrderId || '');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const salesOrders = transactions.filter(t => t.type === 'SALES_ORDER');

  useEffect(() => {
    fetchWarehouses()
      .then((whs: Warehouse[]) => {
        setWarehouses(whs);
        if (!initialData?.shipToWarehouseId) {
          const def = whs.find(w => w.isDefault);
          if (def) setShipToWarehouseId(def.id);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!initialData?.refNo) {
      fetchNextRefNo('PURCHASE_ORDER')
        .then(({ refNo }) => setRefNo(refNo))
        .catch(() => setRefNo('PO-' + String(Date.now()).slice(-5)));
    }
  }, []);

  const [expenseRows, setExpenseRows] = useState<any[]>(() => {
    if (initialData?.items?.some((i: any) => i.accountId)) {
      return initialData.items.filter((i: any) => i.accountId).map((i: any) => ({ ...i, id: Math.random().toString() }));
    }
    return [{ id: Math.random().toString(), accountId: '', amount: 0, memo: '', customerId: '', isBillable: false, classId: '' }];
  });

  const [itemRows, setItemRows] = useState<TransactionItem[]>(() => {
    if (initialData?.items?.some((i: any) => i.itemId)) {
      return initialData.items.filter((i: any) => i.itemId).map((i: any) => ({ ...i, id: Math.random().toString() }));
    }
    return [{ id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false, customerId: '', isBillable: false, classId: '' }];
  });

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const selectedShipTo = customers.find(c => c.id === shipToEntityId);

  const inventoryItems = items.filter(i => i.type === 'Inventory Part' || i.type === 'Non-inventory Part' || i.type === 'Service');

  const addRow = () => {
    if (activeTab === 'Expenses') {
      setExpenseRows([...expenseRows, { id: Math.random().toString(), accountId: '', amount: 0, memo: '', customerId: '', isBillable: false, classId: '' }]);
    } else {
      setItemRows([...itemRows, { id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false, customerId: '', isBillable: false, classId: '' }]);
    }
  };

  const handleItemChange = (index: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newItems = [...itemRows];
    newItems[index] = {
      ...newItems[index],
      itemId,
      description: item.purchaseDescription || item.description || item.name,
      rate: item.cost || 0,
      amount: (item.cost || 0) * (newItems[index].quantity || 1)
    };
    setItemRows(newItems);
  };

  const calculateTotal = () => {
    const expTotal = expenseRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const itemTotal = itemRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    return expTotal + itemTotal;
  };

  const handleRecord = async () => {
    if (!vendorId) return alert("Please select a vendor.");

    const allItems: TransactionItem[] = [
      ...expenseRows.filter(r => r.accountId).map(r => ({
        id: r.id,
        description: r.memo || memo,
        quantity: 1,
        rate: r.amount,
        amount: r.amount,
        tax: false,
        accountId: r.accountId,
        customerId: r.customerId,
        isBillable: r.isBillable,
        classId: r.classId
      })),
      ...itemRows.filter(r => r.itemId).map(r => ({ ...r }))
    ];

    if (allItems.length === 0) return alert("Please add at least one line item.");

    const selectedShipViaEntry = shipVia.find(sv => sv.id === selectedShipViaId);

    const po: Transaction = {
      id: initialData?.id || Math.random().toString(),
      type: 'PURCHASE_ORDER',
      refNo,
      date: poDate,
      expectedDate,
      vendorMessage,
      memo,
      entityId: vendorId,
      customerId: shipToEntityId || undefined,
      classId: classId || undefined,
      items: allItems,
      total: calculateTotal(),
      customerInvoiceNo,
      status: initialData?.status || 'OPEN',
      salesOrderId: salesOrderId || undefined,
      shipToWarehouseId: shipToWarehouseId || undefined,
      attachments,
      ShipAddr: selectedShipTo
        ? { Line1: selectedShipTo.name, Line2: selectedShipTo.address }
        : { Line1: 'Omnificode LTD', Line2: 'Jhang Sadar, Punjab' },
      // Shipping module fields
      shipVia: selectedShipViaEntry?.name || undefined,
      shipViaId: selectedShipViaId || undefined,
      shippingCost: shippingCost > 0 ? shippingCost : undefined,
      shippingBillId: initialData?.shippingBillId,
    };

    await onSave(po);

    // Upload any pending file attachments
    for (const file of pendingFiles) {
      try { await uploadTransactionAttachment(po.id, file); } catch (e) { console.error('Attachment upload failed:', e); }
    }
    setPendingFiles([]);

    // Auto-generate a carrier bill if shipping cost entered.
    // Use the carrier's linked vendor; fall back to the PO's own vendor.
    if (selectedShipViaEntry && (selectedShipViaEntry.vendorId || vendorId) && shippingCost > 0) {
      const existingBillId = initialData?.shippingBillId;
      if (existingBillId) {
        const existingBill = transactions.find(t => t.id === existingBillId);
        await updateShippingBill(po, existingBillId, shippingCost, existingBill, onSave as any);
      } else {
        await createShippingBill(po, selectedShipViaEntry, shippingCost, onSave as any, vendorId || undefined);
      }
    }

    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-hidden">
      <div className="bg-white border-b border-gray-300">
        <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
          <button className="px-5 py-2.5 border-t border-l border-r rounded-t-sm mr-0.5 bg-white border-gray-400 text-[#003366]">Purchase Order</button>
        </div>
        <div className="p-2 flex gap-4 bg-white border-t border-gray-300 overflow-x-auto shadow-sm">
          <button onClick={handleRecord} className="flex flex-col items-center group">
            <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors text-xl">💾</div>
            <span className="text-xs font-bold mt-1">Save</span>
          </button>
          <button onClick={onClose} className="flex flex-col items-center group">
            <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div>
            <span className="text-xs font-bold mt-1">Close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-2xl custom-scrollbar">
        <div className="w-full max-w-7xl mx-auto space-y-8">

          {/* Top Section: Header & Status */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-6">
            <div className="space-y-4">
              <h1 className="text-5xl font-serif italic text-[#003366]">Purchase Order</h1>
              <div className="flex flex-col pt-2">
                <label className="text-xs font-bold text-gray-600 uppercase italic mb-1">Vendor selection</label>
                <select
                  className="w-96 border-b-2 border-blue-300 bg-blue-50/30 px-3 py-2 text-lg font-bold text-[#003366] outline-none focus:border-blue-600 transition-all shadow-sm"
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                >
                  <option value="">&lt;Choose a Vendor&gt;</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">Order total</div>
              <div className="text-5xl font-black text-blue-900 mb-4 font-mono">
                ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</span>
                <span className={`text-xs font-black px-4 py-1 rounded-full ${(initialData?.status || 'OPEN') === 'OPEN' ? 'bg-emerald-100 text-emerald-700' :
                  initialData?.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                  {initialData?.status || 'OPEN'}
                </span>
              </div>
              <div className="mt-2 text-right">
                <span className="text-xs font-bold text-gray-400 uppercase block">P.O. #</span>
                <span className="text-lg font-mono font-black text-blue-600">{refNo}</span>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4 flex flex-col gap-1">
              <AddressSelector
                entity={selectedVendor || null}
                value={selectedVendor ? (formatAddress(selectedVendor.BillAddr) || selectedVendor.address || 'No address registered') : ''}
                onChange={() => {}}
                label="Billing Address"
                placeholder="Select a vendor to see billing details"
              />
            </div>

            <div className="col-span-4 flex flex-col gap-1">
              <AddressSelector
                entity={selectedShipTo || null}
                value={selectedShipTo ? (formatAddress(selectedShipTo.BillAddr) || selectedShipTo.address || '') : ''}
                onChange={() => {}}
                label="Ship to (Customer / Site)"
                placeholder="Select a customer for shipping"
              />
              <select
                className="mt-2 w-full border-b border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-blue-500 bg-transparent"
                value={shipToEntityId}
                onChange={e => setShipToEntityId(e.target.value)}
              >
                <option value="">&lt;Change Shipping Destination&gt;</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {/* Warehouse / Site selector */}
              <div className="mt-3">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 block">Receiving Warehouse / Site</label>
                <select
                  className="w-full border-2 border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs font-bold text-indigo-900 outline-none focus:border-indigo-500 rounded-lg"
                  value={shipToWarehouseId}
                  onChange={e => setShipToWarehouseId(e.target.value)}
                >
                  <option value="">-- No Warehouse --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.isDefault ? `${w.name} (Default)` : w.name}
                      {w.code ? ` [${w.code}]` : ''}
                    </option>
                  ))}
                </select>
                {shipToWarehouseId && warehouses.find(w => w.id === shipToWarehouseId)?.address && (
                  <p className="text-[10px] text-indigo-500 italic mt-1 pl-1">
                    {warehouses.find(w => w.id === shipToWarehouseId)?.address}
                  </p>
                )}
              </div>
            </div>

            <div className="col-span-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">P.O. #</label>
                  <input className="border-b-2 border-gray-300 px-3 py-1.5 text-sm font-bold text-[#003366] w-full outline-none focus:border-blue-600 font-mono" value={refNo} onChange={e => setRefNo(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Cust Inv #</label>
                  <input
                    className="border-b-2 border-gray-300 px-3 py-1.5 text-sm font-bold text-[#003366] w-full outline-none focus:border-blue-600 placeholder:opacity-30"
                    value={customerInvoiceNo}
                    onChange={e => setCustomerInvoiceNo(e.target.value)}
                    placeholder="INV-XXXX"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-600 uppercase">Linked S.O.</label>
                <select
                  className="border-b-2 border-gray-300 px-3 py-1.5 text-sm font-bold text-[#003366] w-full outline-none focus:border-blue-600 bg-transparent"
                  value={salesOrderId}
                  onChange={e => setSalesOrderId(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {salesOrders.map(so => (
                    <option key={so.id} value={so.id}>{so.refNo}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Order Date</label>
                  <input type="date" className="border-b-2 border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-600 bg-transparent" value={poDate} onChange={e => setPoDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Expected</label>
                  <input type="date" className="border-b-2 border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-600 bg-transparent" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Balance Indicator */}
          {selectedVendor && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between px-10 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-2xl">💰</span>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Current Vendor Open Balance:</span>
              </div>
              <span className="font-mono text-xl font-black text-emerald-900">${(selectedVendor.balance || 0).toLocaleString()}</span>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl overflow-hidden shadow-md">
            <div className="flex bg-gray-100 border-b border-gray-300">
              <button
                onClick={() => setActiveTab('Items')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'Items' ? 'bg-white text-[#003366] border-b-2 border-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
              >
                Items & Products
              </button>
              <button
                onClick={() => setActiveTab('Expenses')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'Expenses' ? 'bg-white text-[#003366] border-b-2 border-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'}`}
              >
                Expenses & Categories
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#003366] text-white font-bold uppercase text-xs tracking-wider">
                  <tr>
                    {activeTab === 'Items' ? (
                      <>
                        <th className="px-6 py-4 w-64 border-r border-blue-900/50">Item / Product</th>
                        <th className="px-6 py-4 border-r border-blue-900/50">Description</th>
                        <th className="px-6 py-4 w-24 text-center border-r border-blue-900/50">Qty</th>
                        <th className="px-6 py-4 w-32 text-right border-r border-blue-900/50">Rate</th>
                        <th className="px-6 py-4 w-32 text-right border-r border-blue-900/50">Amount</th>
                        <th className="px-6 py-4 w-24 text-center border-r border-blue-900/50 bg-blue-800/50">Rcvd</th>
                        <th className="px-6 py-4 w-48 border-r border-blue-900/50">Customer</th>
                        <th className="px-4 py-4 w-12"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 w-80 border-r border-blue-900/50">Expense Account</th>
                        <th className="px-6 py-4 border-r border-blue-900/50">Memo</th>
                        <th className="px-6 py-4 w-32 text-right border-r border-blue-900/50">Amount</th>
                        <th className="px-6 py-4 w-48 border-r border-blue-900/50">Project</th>
                        <th className="px-6 py-4 w-48 border-r border-blue-900/50">Class</th>
                        <th className="px-4 py-4 w-12"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === 'Items' ? itemRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 group transition-all duration-300">
                      <td className="p-0 border-r border-slate-50">
                        <select className="w-full h-14 px-8 bg-transparent outline-none font-bold text-slate-700 focus:bg-white transition-colors appearance-none text-sm" value={row.itemId} onChange={e => handleItemChange(idx, e.target.value)}>
                          <option value="">-- Choose Item --</option>
                          {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0 border-r border-slate-50">
                        <input className="w-full h-14 px-8 bg-transparent outline-none italic text-slate-500 placeholder:text-slate-300 focus:bg-white transition-colors text-sm" value={row.description} onChange={e => {
                          const nr = [...itemRows]; nr[idx].description = e.target.value; setItemRows(nr);
                        }} placeholder="Description will auto-populate..." />
                      </td>
                      <td className="p-0 border-r border-slate-50">
                        <input type="number" className="w-full h-14 px-4 text-center outline-none bg-transparent font-black text-slate-700 focus:bg-white transition-colors" value={row.quantity} onChange={e => {
                          const nr = [...itemRows]; nr[idx].quantity = parseFloat(e.target.value) || 0; nr[idx].amount = nr[idx].rate * nr[idx].quantity; setItemRows(nr);
                        }} />
                      </td>
                      <td className="p-0 border-r border-slate-50 px-8 text-right font-mono font-bold text-slate-400">
                        ${row.rate.toFixed(2)}
                      </td>
                      <td className="p-0 border-r border-slate-50 px-8 text-right font-black text-blue-900 font-mono text-sm">
                        ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-0 border-r border-slate-50 text-center bg-blue-50/10 font-black text-blue-600">
                        {row.receivedQuantity || 0}
                      </td>
                      <td className="p-0">
                        <select className="w-full h-14 px-6 bg-transparent outline-none text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors" value={row.customerId} onChange={e => {
                          const nr = [...itemRows]; nr[idx].customerId = e.target.value; setItemRows(nr);
                        }}>
                          <option value="">&lt;Unlinked&gt;</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 text-center">
                        <button onClick={() => setItemRows(itemRows.filter(r => r.id !== row.id))} className="w-8 h-8 rounded-full border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                      </td>
                    </tr>
                  )) : expenseRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 group transition-all duration-300">
                      <td className="p-0 border-r border-slate-50">
                        <select className="w-full h-14 px-8 bg-transparent outline-none font-bold text-slate-700 focus:bg-white transition-colors text-sm" value={row.accountId} onChange={e => {
                          const nr = [...expenseRows]; nr[idx].accountId = e.target.value; setExpenseRows(nr);
                        }}>
                          <option value="">-- Choose Account --</option>
                          {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0 border-r border-slate-50">
                        <input className="w-full h-14 px-8 bg-transparent outline-none italic text-slate-500 focus:bg-white transition-colors text-sm" value={row.memo} onChange={e => {
                          const nr = [...expenseRows]; nr[idx].memo = e.target.value; setExpenseRows(nr);
                        }} placeholder="Expense details..." />
                      </td>
                      <td className="p-0 border-r border-slate-50 px-8">
                        <input type="number" className="w-full h-14 text-right bg-transparent outline-none font-black text-blue-900 font-mono text-sm focus:bg-white transition-colors" value={row.amount || ''} onChange={e => {
                          const nr = [...expenseRows]; nr[idx].amount = parseFloat(e.target.value) || 0; setExpenseRows(nr);
                        }} placeholder="0.00" />
                      </td>
                      <td className="p-0 border-r border-slate-50">
                        <select className="w-full h-14 px-6 bg-transparent outline-none text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors" value={row.customerId} onChange={e => {
                          const nr = [...expenseRows]; nr[idx].customerId = e.target.value; setExpenseRows(nr);
                        }}>
                          <option value="">&lt;Unlinked&gt;</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0">
                        <select className="w-full h-14 px-6 bg-transparent outline-none text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors" value={row.classId} onChange={e => {
                          const nr = [...expenseRows]; nr[idx].classId = e.target.value; setExpenseRows(nr);
                        }}>
                          <option value="">-- Track Class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 text-center">
                        <button onClick={() => setExpenseRows(expenseRows.filter(r => r.id !== row.id))} className="w-8 h-8 rounded-full border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-slate-50/50 p-6 flex items-center justify-between border-t border-slate-100">
                <button onClick={addRow} className="group flex items-center gap-3 text-blue-600 font-black text-[11px] uppercase tracking-widest hover:text-blue-700 transition-all active:scale-95">
                  <span className="bg-blue-600 text-white w-6 h-6 rounded-xl flex items-center justify-center text-sm group-hover:shadow-lg group-hover:shadow-blue-200 transition-all animate-bounce">＋</span>
                  Add a New Line
                </button>

              </div>
            </div>
          </div>

          {/* Bottom Section: Messages & Attachments */}
          <div className="grid grid-cols-12 gap-8 pb-10">
            <div className="col-span-8 grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Message to Vendor</label>
                  <textarea
                    className="w-full border border-slate-200 p-6 text-[13px] h-36 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white rounded-[1.5rem] shadow-sm resize-none italic text-blue-950/70 transition-all placeholder:text-slate-300"
                    placeholder="Special instructions or thank you notes..."
                    value={vendorMessage}
                    onChange={e => setVendorMessage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Internal Memo</label>
                  <textarea
                    className="w-full border border-slate-200 p-6 text-[13px] h-36 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white rounded-[1.5rem] shadow-sm resize-none transition-all placeholder:text-slate-300"
                    placeholder="Records for internal auditing..."
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Documentation & Attachments</label>
                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-white hover:bg-blue-50/20 hover:border-blue-400/50 transition-all group cursor-pointer relative overflow-hidden h-52 group shadow-sm">
                  <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleFileUpload} />
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-sm border border-slate-100">📎</div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Click or Drop Files</p>
                  <p className="text-xs text-slate-400 font-medium">PDF, DOCX or Images (Max 20MB per file)</p>
                </div>

                {(attachments.length > 0 || pendingFiles.length > 0) && (
                  <div className="flex flex-wrap gap-2.5 animate-in fade-in duration-500 px-2 pt-2">
                    {attachments.map(att => (
                      <div key={att.id} className="bg-white border border-slate-200 text-slate-700 pl-4 pr-3 py-2 rounded-2xl flex items-center gap-3 text-xs font-black shadow-sm group hover:border-blue-300 transition-all">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        {att.url ? <a href={att.url} target="_blank" rel="noreferrer" className="truncate max-w-[140px] tracking-tight hover:underline text-blue-600">{att.name}</a> : <span className="truncate max-w-[140px] tracking-tight">{att.name}</span>}
                        <button onClick={async () => { if (att.url && initialData?.id) { try { await deleteTransactionAttachment(initialData.id, att.url.split('/').pop()!); } catch (e) { console.error(e); } } setAttachments(attachments.filter(a => a.id !== att.id)); }} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors ml-1">✕</button>
                      </div>
                    ))}
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="bg-yellow-50 border border-yellow-200 text-yellow-700 pl-4 pr-3 py-2 rounded-2xl flex items-center gap-3 text-xs font-black shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span className="truncate max-w-[140px] tracking-tight">⏳ {f.name}</span>
                        <button onClick={() => setPendingFiles(pendingFiles.filter((_, j) => j !== i))} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-4 bg-gray-50 border-2 border-gray-100 p-8 rounded-2xl flex flex-col gap-4">
              {/* Shipping section */}
              <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase text-blue-700 tracking-widest">Shipping</p>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Ship Via</label>
                  <select
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white outline-none focus:border-blue-500 font-bold"
                    value={selectedShipViaId}
                    onChange={e => setSelectedShipViaId(e.target.value)}
                  >
                    <option value="">-- Select Carrier --</option>
                    {shipVia.filter(sv => sv.isActive).map(sv => (
                      <option key={sv.id} value={sv.id}>{sv.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Shipping Cost</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="border border-gray-300 rounded pl-5 pr-2 py-1 text-xs w-full outline-none focus:border-blue-500 font-bold"
                      value={shippingCost || ''}
                      onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {selectedShipViaId && shipVia.find(sv => sv.id === selectedShipViaId) && (
                  <div className="text-[9px] text-gray-500">
                    {shipVia.find(sv => sv.id === selectedShipViaId)?.vendorId
                      ? <span className="text-green-600 font-bold">✓ Carrier bill will be auto-generated on save</span>
                      : vendorId
                        ? <span className="text-green-600 font-bold">✓ Carrier bill will be auto-generated using this PO's vendor on save</span>
                        : <span className="text-orange-500">⚠ No vendor linked — bill will not be auto-created. Select a vendor on this PO or link one in Ship Via List.</span>
                    }
                  </div>
                )}
                {initialData?.shippingBillId && (
                  <div className="text-[9px] text-blue-600 font-bold">Carrier Bill: #{initialData.shippingBillId.slice(-6)}</div>
                )}
              </div>

              <div className="flex justify-between items-center text-gray-500">
                <span className="text-xs font-bold uppercase">Subtotal</span>
                <span className="font-mono text-sm font-bold">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span className="text-xs font-bold uppercase">Shipping</span>
                <span className="font-mono text-sm font-bold">${shippingCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between items-end">
                <span className="text-sm font-black text-blue-900 uppercase tracking-tighter">Grand Total</span>
                <span className="text-4xl font-black text-[#003366] font-mono leading-none tracking-tighter">
                  ${(calculateTotal() + shippingCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;
