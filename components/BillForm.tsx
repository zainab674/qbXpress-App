
import React, { useState, useEffect } from 'react';
import { Vendor, Account, Item, Transaction, TransactionItem, Customer, Term, QBClass, RecurringTemplate } from '../types';
import { useData } from '../contexts/DataContext';
import RecurringInvoiceDialog from './RecurringInvoiceDialog';

interface Props {
  vendors: Vendor[];
  accounts: Account[];
  items: Item[];
  customers: Customer[];
  terms: Term[];
  transactions: Transaction[];
  classes: QBClass[];
  onSave: (bill: Transaction) => void;
  onClose: () => void;
  initialData?: Transaction;
}

const BillForm: React.FC<Props> = ({ vendors, accounts, items, customers, terms, transactions, classes, onSave, onClose, initialData }) => {
  const { handleSaveRecurringTemplate } = useData();
  const [activeTab, setActiveTab] = useState<'Expenses' | 'Items'>('Expenses');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US'));
  const [dueDate, setDueDate] = useState(new Date().toLocaleDateString('en-US'));
  const [refNo, setRefNo] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [memo, setMemo] = useState('');
  const [address, setAddress] = useState(initialData?.BillAddr?.Line1 || '');
  const [attachments, setAttachments] = useState<any[]>(initialData?.attachments || []);
  const [lotNumber, setLotNumber] = useState(initialData?.lotNumber || '');

  const [expenseRows, setExpenseRows] = useState<any[]>([{ id: Math.random().toString(), accountId: '', amount: 0, memo: '', customerId: '', isBillable: false, classId: '' }]);
  const [itemRows, setItemRows] = useState<TransactionItem[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  useEffect(() => {
    if (initialData) {
      setSelectedVendorId(initialData.entityId);
      setMemo(initialData.memo || `Converted from PO #${initialData.refNo || initialData.id}`);
      if (initialData.type === 'PURCHASE_ORDER') {
        setPurchaseOrderId(initialData.id);
        setLotNumber(initialData.lotNumber || '');
      }

      if (initialData.items) {
        setItemRows(initialData.items.map(i => ({
          ...i,
          id: Math.random().toString() // New IDs for the bill's line items
        })));
        setActiveTab('Items');
      }
    }
  }, [initialData]);

  const allCustomers = customers.map(c => ({ id: c.id, name: c.name }));
  const vendor = vendors.find(v => v.id === selectedVendorId);
  const total = expenseRows.reduce((s, r) => s + (r.amount || 0), 0) +
    itemRows.reduce((s, r) => s + (r.amount || 0), 0);
  const balanceDue = (vendor?.balance || 0) + total;

  useEffect(() => {
    const term = terms.find(t => t.id === selectedTermId);
    if (term) {
      const billDate = new Date(date);
      if (!isNaN(billDate.getTime())) {
        billDate.setDate(billDate.getDate() + term.stdDueDays);
        setDueDate(billDate.toLocaleDateString('en-US'));
      }
    }
  }, [date, selectedTermId, terms]);

  const openReceipts = transactions.filter(t => t.type === 'RECEIVE_ITEM' && t.entityId === selectedVendorId && t.status === 'RECEIVED');
  const openPOs = transactions.filter(t => t.type === 'PURCHASE_ORDER' && t.entityId === selectedVendorId && t.status === 'OPEN');

  // Prompt for item receipt (Chapter 6 Procurement)
  useEffect(() => {
    if (selectedVendorId && openReceipts.length > 0) {
      setShowReceiptDialog(true);
    } else {
      setSelectedReceiptId(null);
      setShowReceiptDialog(false);
    }
    if (vendor && !initialData) {
      setAddress(vendor.address || '');
    }
  }, [selectedVendorId]);

  const handleSelectReceipt = (receipt: Transaction) => {
    setSelectedReceiptId(receipt.id);
    setItemRows(receipt.items.map(i => ({ ...i, id: i.id })));
    setMemo(`Received item(s) from Receipt ${receipt.refNo}`);
    setActiveTab('Items');
    setShowReceiptDialog(false);
  };

  const handleSelectPO = (poId: string) => {
    const po = openPOs.find(p => p.id === poId);
    if (!po) return;
    setPurchaseOrderId(po.id);
    setItemRows(po.items.map(i => ({ ...i, id: Math.random().toString() })));
    setLotNumber(po.lotNumber || '');
    setMemo(`Converted from PO #${po.refNo || po.id}`);
    setActiveTab('Items');
  };

  const addRow = () => {
    if (activeTab === 'Expenses') {
      setExpenseRows([...expenseRows, { id: Math.random().toString(), accountId: '', amount: 0, memo: '', customerId: '', isBillable: false, classId: '' }]);
    } else {
      setItemRows([...itemRows, { id: Math.random().toString(), description: '', quantity: 1, rate: 0, amount: 0, tax: false, customerId: '', isBillable: false, classId: '' }]);
    }
  };

  const handleItemChange = (idx: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newRows = [...itemRows];
    newRows[idx] = {
      ...newRows[idx],
      itemId,
      description: item.purchaseDescription || item.description || item.name,
      rate: item.cost || 0,
      amount: (item.cost || 0) * (newRows[idx].quantity || 1)
    };
    setItemRows(newRows);
  };

  const handleRecord = () => {
    if (!selectedVendorId) return alert("Please select a vendor.");
    const validItems = [
      ...expenseRows.filter(r => r.accountId).map(r => ({
        id: r.id,
        description: r.memo || memo,
        quantity: 1,
        rate: r.amount,
        amount: r.amount,
        tax: false,
        customerId: r.customerId,
        isBillable: r.isBillable,
        classId: r.classId,
        accountId: r.accountId
      })),
      ...itemRows.filter(r => r.itemId).map(r => ({
        ...r,
        classId: (r as any).classId
      }))
    ];

    if (validItems.length === 0) return alert("Please add at least one line item.");

    const bill: Transaction = {
      id: initialData?.id || Math.random().toString(),
      type: 'BILL',
      refNo: refNo || 'BILL-' + Date.now().toString().slice(-4),
      date,
      dueDate,
      entityId: selectedVendorId,
      items: validItems,
      total,
      status: 'OPEN',
      itemReceiptId: selectedReceiptId || undefined,
      purchaseOrderId: purchaseOrderId || undefined,
      classId: selectedClassId || undefined,
      memo,
      attachments,
      lotNumber: lotNumber || undefined,
      BillAddr: { Line1: address }
    };
    onSave(bill);
    onClose();
  };

  const handleSaveRecurring = async (template: RecurringTemplate) => {
    try {
      await handleSaveRecurringTemplate(template);
      alert("Recurring bill template saved successfully!");
      setShowRecurringModal(false);
    } catch (err) {
      alert("Failed to save recurring template");
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
      <div className="bg-white border-b border-gray-300 p-2 flex gap-4 shadow-sm">
        <button onClick={handleRecord} className="flex flex-col items-center group px-4 py-1 hover:bg-blue-50 rounded-sm border border-transparent hover:border-blue-200 transition-all">
          <div className="text-xl">💾</div>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-blue-900">Save & Close</span>
        </button>
        <button onClick={() => setShowRecurringModal(true)} className="flex flex-col items-center group px-4 py-1 hover:bg-purple-50 rounded-sm border border-transparent hover:border-purple-200 transition-all">
          <div className="text-xl">🔄</div>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-purple-900">Memorize</span>
        </button>
        <button onClick={onClose} className="flex flex-col items-center group px-4 py-1 hover:bg-red-50 rounded-sm border border-transparent hover:border-red-200 transition-all">
          <div className="text-xl">✖</div>
          <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter text-red-700">Cancel</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-serif italic text-[#003366] drop-shadow-sm">Enter Bills</h1>
            {selectedVendorId && (
              <div className="flex flex-col gap-1 animate-in slide-in-from-left duration-300">
                <label className="text-[10px] font-bold text-gray-400 uppercase italic">Vendor Address</label>
                <textarea
                  className="border border-gray-200 p-2 text-xs bg-gray-50/50 outline-none w-64 h-20 resize-none font-medium text-gray-600 focus:border-blue-300 rounded shadow-inner"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Address..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-8">
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Balance due</div>
              <div className="text-3xl font-black text-blue-900 drop-shadow-sm">
                PRs{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-500 uppercase italic mb-1 tracking-widest">Vendor Selection</div>
              <select
                className="border-b-2 border-blue-200 px-2 py-1 text-sm bg-blue-50/20 outline-none w-72 font-bold focus:border-blue-500 transition-colors"
                value={selectedVendorId}
                onChange={e => {
                  setSelectedVendorId(e.target.value);
                  setPurchaseOrderId(null);
                  setSelectedReceiptId(null);
                }}
              >
                <option value="">--Select Vendor--</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          {selectedVendorId && openPOs.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] font-bold text-blue-900 uppercase italic mb-1 tracking-widest flex items-center justify-end gap-2">
                <span>📦</span> Select Open PO
              </div>
              <select
                className="border-b-2 border-blue-600 px-2 py-1 text-sm bg-blue-50 outline-none w-72 font-black text-blue-900 focus:border-blue-800 transition-colors shadow-sm animate-in fade-in duration-300"
                value={purchaseOrderId || ''}
                onChange={e => handleSelectPO(e.target.value)}
              >
                <option value="">--Use Purchase Order--</option>
                {openPOs.map(po => (
                  <option key={po.id} value={po.id}>
                    PO #{po.refNo} - ${po.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8 bg-gray-50/50 p-6 border rounded shadow-inner">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Date</label>
            <input className="border-b border-gray-300 p-1 text-xs bg-transparent outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Ref. No.</label>
            <input className="border-b border-gray-300 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-mono" value={refNo} onChange={e => setRefNo(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Amount Due</label>
            <input className="border-b border-gray-300 p-1 text-lg font-black text-right bg-transparent text-blue-900 outline-none" readOnly value={total.toLocaleString(undefined, { minimumFractionDigits: 2 })} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Terms</label>
            <select
              className="border-b border-gray-300 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-bold"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
            >
              <option value="">&lt;None&gt;</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Class</label>
            <select
              className="border-b border-gray-300 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-bold"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            >
              <option value="">&lt;None&gt;</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Bill Due Date</label>
            <input className="border-b border-gray-300 p-1 text-xs bg-transparent font-bold text-red-700 outline-none" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Lot Number</label>
            <input className="border-b border-gray-300 p-1 text-xs bg-transparent font-bold text-purple-700 outline-none font-mono" placeholder="Optional" value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
          </div>
          <div className="flex flex-col col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Memo</label>
            <input className="border-b border-gray-300 p-1 text-xs bg-transparent outline-none" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Internal description..." />
          </div>
        </div>

        <div className="flex border-b-2 border-gray-200 text-[10px] font-bold uppercase">
          <button onClick={() => setActiveTab('Expenses')} className={`px-8 py-2 border-t-2 border-l-2 border-r-2 rounded-t-sm -mb-[2px] transition-all ${activeTab === 'Expenses' ? 'bg-white border-blue-600 text-blue-900 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]' : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-50'}`}>Expenses</button>
          <button onClick={() => setActiveTab('Items')} className={`px-8 py-2 border-t-2 border-l-2 border-r-2 rounded-t-sm -mb-[2px] transition-all ${activeTab === 'Items' ? 'bg-white border-blue-600 text-blue-900 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]' : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-50'}`}>Items</button>
        </div>

        <div className="border-x-2 border-b-2 border-gray-200 min-h-[300px] bg-white overflow-hidden rounded-b-sm">
          <table className="w-full text-[11px]">
            <thead className="bg-[#f8f9fa] border-b border-gray-300 text-left text-[#003366] font-black uppercase tracking-tighter">
              <tr>
                {activeTab === 'Expenses' ? (
                  <>
                    <th className="px-3 py-2 border-r w-64">Category</th>
                    <th className="px-3 py-2 border-r w-32 text-right">Amount</th>
                    <th className="px-3 py-2 border-r">Memo</th>
                    <th className="px-3 py-2 border-r w-64">Customer</th>
                    <th className="px-3 py-2 border-r w-32">Class</th>
                    <th className="px-3 py-2 w-16 text-center">B</th>
                    <th className="px-3 py-2 w-8"></th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2 border-r w-48">Item</th>
                    <th className="px-3 py-2 border-r">Description</th>
                    <th className="px-3 py-2 border-r w-16 text-center">Qty</th>
                    <th className="px-3 py-2 border-r w-24 text-right">Cost</th>
                    <th className="px-3 py-2 border-r w-24 text-right">Amount</th>
                    <th className="px-3 py-2 border-r w-64">Customer</th>
                    <th className="px-3 py-2 border-r w-32">Class</th>
                    <th className="px-3 py-2 w-8 text-center">B</th>
                    <th className="px-3 py-2 w-8"></th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {activeTab === 'Expenses' ? (
                expenseRows.map((r, i) => (
                  <tr key={r.id} className="border-b h-9 hover:bg-blue-50/30 group transition-colors">
                    <td className="border-r p-0">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.accountId} onChange={e => {
                        const nr = [...expenseRows]; nr[i].accountId = e.target.value; setExpenseRows(nr);
                      }}>
                        <option value="">--Select Category--</option>
                        {accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </td>
                    <td className="border-r p-0"><input type="number" className="w-full h-full px-3 text-right outline-none bg-transparent font-bold text-blue-900" value={r.amount || ''} onChange={e => {
                      const nr = [...expenseRows]; nr[i].amount = parseFloat(e.target.value) || 0; setExpenseRows(nr);
                    }} /></td>
                    <td className="border-r p-0"><input className="w-full h-full px-3 outline-none bg-transparent italic text-gray-500" value={r.memo} onChange={e => {
                      const nr = [...expenseRows]; nr[i].memo = e.target.value; setExpenseRows(nr);
                    }} placeholder="Line description..." /></td>
                    <td className="border-r p-0 bg-yellow-50/10">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.customerId} onChange={e => {
                        const nr = [...expenseRows]; nr[i].customerId = e.target.value; setExpenseRows(nr);
                      }}>
                        <option value="">&lt;Select Customer&gt;</option>
                        {allCustomers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                      </select>
                    </td>
                    <td className="border-r p-0 bg-blue-50/10">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.classId || ''} onChange={e => {
                        const nr = [...expenseRows]; nr[i].classId = e.target.value; setExpenseRows(nr);
                      }}>
                        <option value=""></option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="text-center p-0">
                      <input type="checkbox" checked={r.isBillable} onChange={e => {
                        const nr = [...expenseRows]; nr[i].isBillable = e.target.checked; setExpenseRows(nr);
                      }} />
                    </td>
                    <td className="text-center p-1">
                      <button onClick={() => setExpenseRows(expenseRows.filter(x => x.id !== r.id))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </td>
                  </tr>
                ))
              ) : (
                itemRows.map((r, i) => (
                  <tr key={r.id} className="border-b h-9 hover:bg-blue-50/30 group transition-colors">
                    <td className="border-r p-0">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.itemId || ''} onChange={e => handleItemChange(i, e.target.value)}>
                        <option value="">--Select Item--</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </td>
                    <td className="border-r p-0 px-3 italic text-gray-500">{r.description}</td>
                    <td className="border-r p-0"><input type="number" className="w-full h-full text-center outline-none bg-transparent" value={r.quantity} onChange={e => {
                      const nr = [...itemRows]; nr[i].quantity = parseFloat(e.target.value) || 0; nr[i].amount = nr[i].rate * nr[i].quantity; setItemRows(nr);
                    }} /></td>
                    <td className="border-r p-0 px-3 text-right text-gray-600">${r.rate.toFixed(2)}</td>
                    <td className="border-r p-0 px-3 text-right font-black text-blue-900">${r.amount.toFixed(2)}</td>
                    <td className="border-r p-0 bg-yellow-50/10">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.customerId} onChange={e => {
                        const nr = [...itemRows]; nr[i].customerId = e.target.value; setItemRows(nr);
                      }}>
                        <option value="">&lt;Select Customer&gt;</option>
                        {allCustomers.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                      </select>
                    </td>
                    <td className="border-r p-0 bg-blue-50/10">
                      <select className="w-full h-full px-3 bg-transparent outline-none appearance-none" value={r.classId || ''} onChange={e => {
                        const nr = [...itemRows]; nr[i].classId = e.target.value; setItemRows(nr);
                      }}>
                        <option value=""></option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="text-center p-0"><input type="checkbox" checked={r.isBillable} onChange={e => {
                      const nr = [...itemRows]; nr[i].isBillable = e.target.checked; setItemRows(nr);
                    }} /></td>
                    <td className="text-center p-1">
                      <button onClick={() => setItemRows(itemRows.filter(x => x.id !== r.id))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </td>
                  </tr>
                ))
              )}
              <tr><td colSpan={7} className="p-2 bg-gray-50/50"><button onClick={addRow} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-tighter cursor-pointer underline">+ Add Line</button></td></tr>
              {[1, 2, 3].map(i => <tr key={i} className="h-9 border-b border-gray-100 opacity-10"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex justify-between items-start">
            <div className="flex-1 max-w-lg">
              <label className="text-[10px] font-bold text-gray-400 uppercase italic mb-2 block">Attachments</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50/30 hover:bg-gray-50 transition-colors group cursor-pointer relative overflow-hidden">
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const newAttachments = files.map((f: File) => ({
                      id: Math.random().toString(),
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      uploadDate: new Date().toLocaleDateString()
                    }));
                    setAttachments([...attachments, ...newAttachments]);
                  }}
                />
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📎</div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drop files here or click to upload</p>
                <p className="text-[9px] text-gray-400 mt-1">Maximum file size: 20 MB</p>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {attachments.map(att => (
                    <div key={att.id} className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full flex items-center gap-2 animate-in zoom-in duration-200">
                      <span className="text-[10px] font-bold text-blue-700 truncate max-w-[150px]">{att.name}</span>
                      <button
                        onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                        className="text-blue-300 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 text-right">
              <button className="px-6 py-2 border border-gray-300 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors">Clear Splitting</button>
              <button className="px-6 py-2 bg-blue-900 text-white rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-800 transition-colors shadow-lg">Recalculate</button>
            </div>
          </div>
        </div>
      </div>

      {showReceiptDialog && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#003366] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#003366] p-3 flex justify-between items-center">
              <h3 className="text-white font-bold uppercase tracking-widest text-xs">Open Item Receipts</h3>
              <button onClick={() => setShowReceiptDialog(false)} className="text-white hover:text-red-400">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm font-black text-blue-900 mb-4 italic">The vendor you selected has open item receipts. Do you want to receive a bill against one of these receipts? (Page 113)</p>
              <div className="border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b font-bold h-8">
                    <tr><th className="px-4 text-left">Ref. No</th><th className="px-4 text-left">Date</th><th className="px-4 text-right">Amount</th><th className="px-4"></th></tr>
                  </thead>
                  <tbody>
                    {openReceipts.map(r => (
                      <tr key={r.id} className="border-b h-10 hover:bg-blue-50">
                        <td className="px-4 font-bold">{r.refNo}</td>
                        <td className="px-4">{r.date}</td>
                        <td className="px-4 text-right font-mono font-bold">${r.total.toLocaleString()}</td>
                        <td className="px-4 text-right">
                          <button onClick={() => handleSelectReceipt(r)} className="bg-blue-600 text-white px-4 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700">Select</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowReceiptDialog(false)} className="px-6 py-2 border border-gray-400 text-xs font-bold rounded hover:bg-gray-50">No, Create New Bill</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRecurringModal && (
        <RecurringInvoiceDialog
          entities={vendors}
          entityType="Vendor"
          baseTransaction={{
            type: 'BILL',
            refNo: refNo,
            date: date,
            dueDate: dueDate,
            entityId: selectedVendorId,
            items: [
              ...expenseRows.filter(r => r.accountId).map(r => ({
                id: r.id,
                description: r.memo || memo,
                quantity: 1,
                rate: r.amount,
                amount: r.amount,
                tax: false,
                customerId: r.customerId,
                isBillable: r.isBillable,
                classId: r.classId,
                accountId: r.accountId
              })),
              ...itemRows.filter(r => r.itemId).map(r => ({
                ...r,
                classId: (r as any).classId
              }))
            ],
            total: total,
            status: 'OPEN',
            memo: memo,
            BillAddr: { Line1: address }
          } as any}
          onSave={handleSaveRecurring}
          onClose={() => setShowRecurringModal(false)}
        />
      )}
    </div>
  );
};

export default BillForm;
