
import React, { useState } from 'react';
import { Vendor, Account, Transaction, TransactionItem, Item } from '../types';

interface Props {
  vendors: Vendor[];
  accounts: Account[];
  items: Item[];
  onSave: (credit: Transaction) => void;
  onClose: () => void;
}

const VendorCreditForm: React.FC<Props> = ({ vendors, accounts, items, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Expenses' | 'Items'>('Expenses');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US'));
  const [refNo, setRefNo] = useState('VC-' + Math.floor(Math.random() * 9000 + 1000));
  const [memo, setMemo] = useState('');

  const [expenseRows, setExpenseRows] = useState<any[]>([
    { id: Math.random().toString(), accountId: '', amount: 0, memo: '' }
  ]);
  const [itemRows, setItemRows] = useState<TransactionItem[]>([]);

  const totalAmount = expenseRows.reduce((sum, row) => sum + (row.amount || 0), 0) +
    itemRows.reduce((sum, row) => sum + (row.amount || 0), 0);

  const handleAddRow = () => {
    if (activeTab === 'Expenses') {
      setExpenseRows([...expenseRows, { id: Math.random().toString(), accountId: '', amount: 0, memo: '' }]);
    } else {
      setItemRows([...itemRows, { id: Math.random().toString(), itemId: '', description: '', quantity: 1, rate: 0, amount: 0, tax: false }]);
    }
  };

  const handleItemChange = (id: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setItemRows(prev => prev.map(li => li.id === id ? {
      ...li,
      itemId,
      description: item.purchaseDescription || item.description || item.name,
      rate: item.cost || 0,
      amount: (item.cost || 0) * li.quantity
    } : li));
  };

  const handleItemQtyChange = (id: string, qty: number) => {
    setItemRows(prev => prev.map(li => li.id === id ? {
      ...li,
      quantity: qty,
      amount: qty * li.rate
    } : li));
  };

  const handleRecord = () => {
    if (!selectedVendorId) return alert("Please select a vendor.");
    if (totalAmount <= 0) return alert("Credit amount must be greater than zero.");

    const credit: Transaction = {
      id: Math.random().toString(),
      type: 'VENDOR_CREDIT',
      refNo: refNo,
      date: date,
      entityId: selectedVendorId,
      items: [
        ...expenseRows.filter(r => r.accountId).map(r => ({
          id: r.id,
          description: r.memo || memo || 'Vendor Credit (Expense)',
          quantity: 1,
          rate: r.amount,
          amount: r.amount,
          tax: false,
          accountId: r.accountId
        })),
        ...itemRows.filter(r => r.itemId).map(r => ({
          ...r,
          description: r.description || memo || 'Vendor Credit (Item)'
        }))
      ],
      total: totalAmount,
      status: 'OPEN'
    };
    onSave(credit);
    onClose();
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="bg-white p-4 border-b-2 border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Vendor Credit</h2>
            <div className={`w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-inner`}>C</div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRecord} className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] transition-colors uppercase tracking-widest">Save & Close</button>
            <button onClick={onClose} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm">Cancel</button>
          </div>
        </div>

        <div className="p-8 flex-1 overflow-auto bg-[#f8f9fa] custom-scrollbar">
          <div className="grid grid-cols-3 gap-8 mb-8 bg-white p-6 border rounded shadow-md">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Vendor</label>
              <select
                className="border-b-2 border-blue-200 p-1 text-sm bg-blue-50/10 font-bold outline-none focus:border-blue-500"
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
              >
                <option value="">--Select Vendor--</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Date</label>
              <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent outline-none focus:border-blue-500 font-bold" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 text-right">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Ref. No.</label>
              <input className="border-b-2 border-gray-200 p-1 text-xs bg-transparent text-right outline-none focus:border-blue-500 font-mono font-bold" value={refNo} onChange={e => setRefNo(e.target.value)} />
            </div>
          </div>

          <div className="flex border-b text-[10px] font-black uppercase mb-[-1px]">
            <button onClick={() => setActiveTab('Expenses')} className={`px-6 py-2 border-t border-l border-r rounded-t shadow-sm ${activeTab === 'Expenses' ? 'bg-white border-blue-600 border-t-2 text-blue-900' : 'bg-gray-100 text-gray-400'}`}>Expenses</button>
            <button onClick={() => setActiveTab('Items')} className={`px-6 py-2 border-t border-l border-r rounded-t shadow-sm ${activeTab === 'Items' ? 'bg-white border-blue-600 border-t-2 text-blue-900 ml-1' : 'bg-gray-100 text-gray-400 ml-1'}`}>Items</button>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded overflow-hidden shadow-xl z-10 relative">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                {activeTab === 'Expenses' ? (
                  <tr><th className="px-4 py-2 border-r w-64">Account</th><th className="px-4 py-2 border-r text-right w-32">Amount</th><th className="px-4 py-2">Memo</th></tr>
                ) : (
                  <tr><th className="px-4 py-2 border-r w-16 text-center">Qty</th><th className="px-4 py-2 border-r w-48">Item</th><th className="px-4 py-2 border-r">Description</th><th className="px-4 py-2 border-r text-right w-24">Cost</th><th className="px-4 py-2 text-right w-32">Amount</th></tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'Expenses' ? (
                  expenseRows.map((row, idx) => (
                    <tr key={row.id} className="border-b hover:bg-blue-50/30 group">
                      <td className="p-0 border-r">
                        <select className="w-full h-full p-2 px-4 bg-transparent outline-none appearance-none font-bold" value={row.accountId} onChange={e => { const nr = [...expenseRows]; nr[idx].accountId = e.target.value; setExpenseRows(nr); }}>
                          <option value="">--Select Account--</option>
                          {accounts.filter(a => a.type === 'Expense').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0 border-r">
                        <input type="number" className="w-full h-full p-2 px-4 text-right bg-transparent outline-none font-black text-blue-900" value={row.amount || ''} onChange={e => { const nr = [...expenseRows]; nr[idx].amount = parseFloat(e.target.value) || 0; setExpenseRows(nr); }} />
                      </td>
                      <td className="p-0"><input className="w-full h-full p-2 px-4 bg-transparent outline-none italic text-gray-500" value={row.memo} onChange={e => { const nr = [...expenseRows]; nr[idx].memo = e.target.value; setExpenseRows(nr); }} placeholder="Reason for credit line..." /></td>
                    </tr>
                  ))
                ) : (
                  itemRows.map((row, idx) => (
                    <tr key={row.id} className="border-b hover:bg-blue-50/30">
                      <td className="p-0 border-r">
                        <input type="number" className="w-full h-full p-2 text-center bg-transparent outline-none font-bold" value={row.quantity} onChange={e => handleItemQtyChange(row.id, parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="p-0 border-r">
                        <select className="w-full h-full p-2 px-4 bg-transparent outline-none appearance-none font-bold" value={row.itemId || ''} onChange={e => handleItemChange(row.id, e.target.value)}>
                          <option value="">--Select Item--</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td className="p-0 border-r">
                        <input className="w-full h-full p-2 px-4 bg-transparent outline-none italic text-gray-500" value={row.description} readOnly />
                      </td>
                      <td className="p-2 px-4 text-right border-r text-gray-500 font-mono">${row.rate.toFixed(2)}</td>
                      <td className="p-2 px-4 text-right font-black text-blue-900 font-mono">${row.amount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-50/50">
                  <td colSpan={5} className="p-2 px-4">
                    <button onClick={handleAddRow} className="text-blue-600 font-black text-[10px] uppercase hover:underline tracking-tighter cursor-pointer underline">+ Add Line</button>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-[#003366] text-white">
                <tr>
                  <td className="p-3 text-right font-black uppercase text-[10px] tracking-widest opacity-70">Total Credit Amount:</td>
                  <td className="p-3 text-right font-black font-mono text-xl">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td colSpan={activeTab === 'Expenses' ? 1 : 3}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-8 bg-white p-6 border rounded shadow-md border-l-8 border-l-blue-600">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic block mb-2">Main Memo</label>
            <textarea
              className="w-full border-2 border-gray-100 p-3 text-xs h-20 outline-none focus:border-blue-200 bg-gray-50/50 rounded transition-all resize-none"
              placeholder="Internal notes about this overall credit..."
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorCreditForm;

